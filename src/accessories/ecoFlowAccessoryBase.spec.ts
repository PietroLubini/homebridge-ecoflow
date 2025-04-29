import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { DeviceInfo } from '@ecoflow/apis/containers/deviceInfo';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import {
  MqttQuotaMessage,
  MqttSetMessage,
  MqttSetReplyMessage,
  MqttStatusMessage,
} from '@ecoflow/apis/interfaces/mqttApiContracts';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';
import { DeviceConfig } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { getActualServices, MockService } from '@ecoflow/helpers/tests/accessoryTestHelper';
import { sleep } from '@ecoflow/helpers/tests/sleep';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Service as HapService } from 'hap-nodejs';
import { Logging, PlatformAccessory } from 'homebridge';
import { Subscription } from 'rxjs';

jest.mock('@ecoflow/services/batteryStatusService');
jest.mock('@ecoflow/services/accessoryInformationService');

class MockEcoFlowAccessory extends EcoFlowAccessoryBase {
  private readonly _batteryService: BatteryStatusService;

  constructor(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    log: Logging,
    httpApiManager: EcoFlowHttpApiManager,
    mqttApiManager: EcoFlowMqttApiManager,
    batteryStatusProvider: BatteryStatusProvider
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager);
    this._batteryService = new BatteryStatusService(this, batteryStatusProvider);
  }

  public override async initializeDefaultValues(): Promise<void> {}

  public override processQuotaMessage(): void {}

  public get batteryService(): BatteryStatusService {
    return this._batteryService;
  }

  protected override getServices(): ServiceBase[] {
    return [this._batteryService];
  }
}

describe('EcoFlowAccessoryBase', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;
  let batteryStatusServiceMock: jest.Mocked<BatteryStatusService>;
  let accessoryInformationServiceMock: jest.Mocked<AccessoryInformationService>;
  let batteryStatusProviderMock: jest.Mocked<BatteryStatusProvider>;
  let deviceInfo: DeviceInfo;
  let accessory: MockEcoFlowAccessory;
  const expectedServices: MockService[] = [
    {
      Name: 'BatteryStatusService',
    },
    {
      Name: 'AccessoryInformationService',
    },
  ];

  function waitMqttReconnection(attempts: number): Promise<void> {
    return sleep(config.reconnectMqttTimeoutMs! * (0.5 + attempts));
  }

  function waitSetReplyTimeout(): Promise<void> {
    return sleep(config.setReplyWaitResponseTimeoutMs! * 1.5);
  }

  beforeEach(() => {
    function createService<TService extends ServiceBase>(
      Service: new (ecoFlowAccessory: MockEcoFlowAccessory, batteryStatusProvider: BatteryStatusProvider) => TService,
      mockResetCallback: ((serviceMock: jest.Mocked<TService>) => void) | null = null
    ): jest.Mocked<TService> {
      const serviceMock = new Service(accessory, batteryStatusProviderMock) as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<ServiceBase>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      if (mockResetCallback) {
        mockResetCallback(serviceMock);
      }
      (Service as jest.Mock).mockImplementation(() => serviceMock);
      return serviceMock;
    }

    batteryStatusServiceMock = createService(BatteryStatusService, mock => {
      mock.updateBatteryLevel.mockReset();
      mock.updateChargingState.mockReset();
    });
    accessoryInformationServiceMock = createService(AccessoryInformationService);

    accessoryMock = { services: jest.fn(), removeService: jest.fn() } as unknown as jest.Mocked<PlatformAccessory>;
    platformMock = {} as unknown as jest.Mocked<EcoFlowHomebridgePlatform>;
    logMock = { debug: jest.fn(), warn: jest.fn() } as unknown as jest.Mocked<Logging>;
    httpApiManagerMock = {
      getAllQuotas: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowHttpApiManager>;
    mqttApiManagerMock = {
      destroy: jest.fn(),
      subscribeOnQuotaTopic: jest.fn(),
      subscribeOnSetReplyTopic: jest.fn(),
      subscribeOnStatusTopic: jest.fn(),
      subscribeOnQuotaMessage: jest.fn(),
      subscribeOnSetReplyMessage: jest.fn(),
      subscribeOnStatusMessage: jest.fn(),
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowMqttApiManager>;
    batteryStatusProviderMock = {} as jest.Mocked<BatteryStatusProvider>;
    config = {
      secretKey: 'secretKey1',
      accessKey: 'accessKey1',
      serialNumber: 'sn1',
      setReplyWaitResponseTimeoutMs: 100,
    } as unknown as DeviceConfig;
    accessory = new MockEcoFlowAccessory(
      platformMock,
      accessoryMock,
      config,
      logMock,
      httpApiManagerMock,
      mqttApiManagerMock,
      batteryStatusProviderMock
    );
    deviceInfo = new DeviceInfo(config, logMock);
  });

  describe('initialize', () => {
    it('should add required services when initializing accessory', async () => {
      await accessory.initialize();
      const actual = getActualServices(accessory);

      expect(actual).toEqual(expectedServices);
      expect(batteryStatusServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('connectMqtt', () => {
    beforeEach(() => {
      config.reconnectMqttTimeoutMs = 100;
    });

    it('should connect to mqtt server during initialization when subscription to quota and set_reply topic is successful', async () => {
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);

      await accessory.initialize();
      await waitMqttReconnection(1);

      expect(mqttApiManagerMock.subscribeOnQuotaTopic).toHaveBeenCalledTimes(1);
      expect(mqttApiManagerMock.subscribeOnQuotaTopic).toHaveBeenCalledWith(deviceInfo);
      expect(mqttApiManagerMock.subscribeOnSetReplyTopic).toHaveBeenCalledTimes(1);
      expect(mqttApiManagerMock.subscribeOnSetReplyTopic).toHaveBeenCalledWith(deviceInfo);
      expect(mqttApiManagerMock.subscribeOnStatusTopic).toHaveBeenCalledTimes(1);
      expect(mqttApiManagerMock.subscribeOnStatusTopic).toHaveBeenCalledWith(deviceInfo);
    });

    it('should re-connect to mqtt server when subscription to quota was failed during initialization', async () => {
      mqttApiManagerMock.subscribeOnQuotaTopic
        .mockImplementationOnce(() => Promise.resolve(false))
        .mockImplementationOnce(() => Promise.resolve(true));
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);

      await accessory.initialize();
      await waitMqttReconnection(1);

      expect(mqttApiManagerMock.subscribeOnQuotaTopic).toHaveBeenCalledTimes(2);
      expect(mqttApiManagerMock.subscribeOnSetReplyTopic).toHaveBeenCalledTimes(1);
      expect(mqttApiManagerMock.subscribeOnStatusTopic).toHaveBeenCalledTimes(1);
    });

    it('should re-connect to mqtt server when subscription to set_reply was failed during initialization', async () => {
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic
        .mockImplementationOnce(() => Promise.resolve(false))
        .mockImplementationOnce(() => Promise.resolve(true));
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);

      await accessory.initialize();
      await waitMqttReconnection(1);

      expect(mqttApiManagerMock.subscribeOnQuotaTopic).toHaveBeenCalledTimes(2);
      expect(mqttApiManagerMock.subscribeOnSetReplyTopic).toHaveBeenCalledTimes(2);
      expect(mqttApiManagerMock.subscribeOnStatusTopic).toHaveBeenCalledTimes(1);
    });

    it('should re-connect to mqtt server when subscription to status was failed during initialization', async () => {
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic
        .mockImplementationOnce(() => Promise.resolve(false))
        .mockImplementationOnce(() => Promise.resolve(true));

      await accessory.initialize();
      await waitMqttReconnection(1);

      expect(mqttApiManagerMock.subscribeOnQuotaTopic).toHaveBeenCalledTimes(2);
      expect(mqttApiManagerMock.subscribeOnSetReplyTopic).toHaveBeenCalledTimes(2);
      expect(mqttApiManagerMock.subscribeOnStatusTopic).toHaveBeenCalledTimes(2);
    });
  });

  describe('subscribeOnParameterUpdates', () => {
    let quotaSubscriptionMock: jest.Mocked<Subscription>;
    let setReplySubscriptionMock: jest.Mocked<Subscription>;
    let statusSubscriptionMock: jest.Mocked<Subscription>;

    beforeEach(() => {
      quotaSubscriptionMock = jest.fn() as unknown as jest.Mocked<Subscription>;
      setReplySubscriptionMock = jest.fn() as unknown as jest.Mocked<Subscription>;
      statusSubscriptionMock = jest.fn() as unknown as jest.Mocked<Subscription>;
    });

    it('should not subscribe on parameters updates for quota, set_reply and status messages when mqtt is failed to connect', async () => {
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(false);

      await accessory.initialize();
      const actual = Reflect.get(accessory, 'subscriptions');

      expect(actual).toEqual([]);
      expect(mqttApiManagerMock.subscribeOnQuotaMessage).not.toHaveBeenCalled();
      expect(mqttApiManagerMock.subscribeOnSetReplyMessage).not.toHaveBeenCalled();
      expect(mqttApiManagerMock.subscribeOnStatusMessage).not.toHaveBeenCalled();
    });

    it('should subscribe on parameters updates for quota, set_reply and status messages when mqtt is connected successfully', async () => {
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnQuotaMessage.mockReturnValueOnce(quotaSubscriptionMock);
      mqttApiManagerMock.subscribeOnSetReplyMessage.mockReturnValueOnce(setReplySubscriptionMock);
      mqttApiManagerMock.subscribeOnStatusMessage.mockReturnValueOnce(statusSubscriptionMock);

      await accessory.initialize();
      const actual = Reflect.get(accessory, 'subscriptions');

      expect(actual).toEqual([quotaSubscriptionMock, setReplySubscriptionMock, statusSubscriptionMock]);
      expect(mqttApiManagerMock.subscribeOnQuotaMessage).toHaveBeenCalledWith(deviceInfo, expect.any(Function));
      expect(mqttApiManagerMock.subscribeOnSetReplyMessage).toHaveBeenCalledWith(deviceInfo, expect.any(Function));
      expect(mqttApiManagerMock.subscribeOnStatusMessage).toHaveBeenCalledWith(deviceInfo, expect.any(Function));
    });

    it('should filter failed subscription on parameters updates when mqtt is connected successfully', async () => {
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnQuotaMessage.mockReturnValueOnce(undefined);
      mqttApiManagerMock.subscribeOnSetReplyMessage.mockReturnValueOnce(setReplySubscriptionMock);
      mqttApiManagerMock.subscribeOnStatusMessage.mockReturnValueOnce(undefined);

      await accessory.initialize();
      const actual = Reflect.get(accessory, 'subscriptions');

      expect(actual).toEqual([setReplySubscriptionMock]);
      expect(mqttApiManagerMock.subscribeOnQuotaMessage).toHaveBeenCalledWith(deviceInfo, expect.any(Function));
      expect(mqttApiManagerMock.subscribeOnSetReplyMessage).toHaveBeenCalledWith(deviceInfo, expect.any(Function));
      expect(mqttApiManagerMock.subscribeOnStatusMessage).toHaveBeenCalledWith(deviceInfo, expect.any(Function));
    });
  });

  describe('processQuotaMessage', () => {
    let processQuotaMessage: (value: MqttQuotaMessage) => void;
    let processQuotaMessageMock: jest.Mock;

    beforeEach(async () => {
      processQuotaMessageMock = jest.fn();
      accessory.processQuotaMessage = processQuotaMessageMock;
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);

      await accessory.initialize();
      processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
    });

    it('should call processQuotaMessage when new quota message is received', async () => {
      const message = { param1: 'value1' };
      processQuotaMessage(message);

      expect(processQuotaMessageMock).toHaveBeenCalledWith(message);
    });
  });

  describe('processSetReplyMessage', () => {
    let message: MqttSetReplyMessage;
    let processSetReplyMessage: (value: MqttSetReplyMessage) => void;
    let revertMock: jest.Mock;
    beforeEach(async () => {
      revertMock = jest.fn();
      message = {
        id: 500000,
        version: 'version1',
        data: { ack: false },
      };
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);
      await accessory.initialize();
      processSetReplyMessage = mqttApiManagerMock.subscribeOnSetReplyMessage.mock.calls[0][1]!;
    });

    it("should ignore 'set_reply' message when no 'set' command was sent yet", () => {
      processSetReplyMessage(message);

      expect(logMock.debug).toHaveBeenCalledWith(
        'Received "SetReply" response was not sent by accessory. Ignore it:',
        message
      );
    });

    it("should ignore 'set_reply' message when it was not initialized by 'set' command from current instance", async () => {
      await accessory.sendSetCommand({} as MqttSetMessage, revertMock);
      message.id = 123;

      processSetReplyMessage(message);

      expect(logMock.debug).toHaveBeenCalledWith(
        'Received "SetReply" response was not sent by accessory. Ignore it:',
        message
      );
    });

    it('should clear timeout for message when it is already processed', async () => {
      await accessory.sendSetCommand({} as MqttSetMessage, revertMock);
      message.data.ack = false;

      processSetReplyMessage(message);
      await waitSetReplyTimeout();

      expect(logMock.debug).not.toHaveBeenCalledWith('Timed out message is already processed. Ignore it:', 500000);
    });

    it("should do nothing when 'set_reply' message contains successful 'ack' acknowledgement", async () => {
      await accessory.sendSetCommand({} as MqttSetMessage, revertMock);
      message.data.ack = false;

      processSetReplyMessage(message);

      expect(revertMock).not.toHaveBeenCalled();
      expect(logMock.debug).toHaveBeenCalledWith('Setting of a value was successful for:', 500000);
    });

    it("should call revert function when 'set_reply' message contains failed 'ack' acknowledgement", async () => {
      await accessory.sendSetCommand({} as MqttSetMessage, revertMock);
      message.data.ack = true;

      processSetReplyMessage(message);

      expect(revertMock).toHaveBeenCalledTimes(1);
      expect(logMock.warn).toHaveBeenCalledWith('Failed to set a value. Reverts value back for:', 500000);
    });

    it("should do nothing when 'set_reply' message contains successful 'result' acknowledgement", async () => {
      await accessory.sendSetCommand({} as MqttSetMessage, revertMock);
      message.data.result = false;

      processSetReplyMessage(message);

      expect(revertMock).not.toHaveBeenCalled();
      expect(logMock.debug).toHaveBeenCalledWith('Setting of a value was successful for:', 500000);
    });

    it("should call revert function when 'set_reply' message contains failed 'result' acknowledgement", async () => {
      await accessory.sendSetCommand({} as MqttSetMessage, revertMock);
      message.data.result = true;

      processSetReplyMessage(message);

      expect(revertMock).toHaveBeenCalledTimes(1);
      expect(logMock.warn).toHaveBeenCalledWith('Failed to set a value. Reverts value back for:', 500000);
    });

    it("should do nothing when 'set_reply' message contains successful 'configOk' acknowledgement", async () => {
      await accessory.sendSetCommand({} as MqttSetMessage, revertMock);
      message.data.configOk = true;

      processSetReplyMessage(message);

      expect(revertMock).not.toHaveBeenCalled();
      expect(logMock.debug).toHaveBeenCalledWith('Setting of a value was successful for:', 500000);
    });

    it("should call revert function when 'set_reply' message contains failed 'configOk' acknowledgement", async () => {
      await accessory.sendSetCommand({} as MqttSetMessage, revertMock);
      message.data.configOk = false;

      processSetReplyMessage(message);

      expect(revertMock).toHaveBeenCalledTimes(1);
      expect(logMock.warn).toHaveBeenCalledWith('Failed to set a value. Reverts value back for:', 500000);
    });

    it("should call revert function when 'set_reply' message does not contain ack/result/configOk acknowledgement", async () => {
      await accessory.sendSetCommand({} as MqttSetMessage, revertMock);
      delete message.data.ack;

      processSetReplyMessage(message);

      expect(revertMock).toHaveBeenCalledTimes(1);
      expect(logMock.warn).toHaveBeenCalledWith('Failed to set a value. Reverts value back for:', 500000);
    });
  });

  describe('processStatusMessage', () => {
    let processStatusMessage: (value: MqttStatusMessage) => void;

    beforeEach(async () => {
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);

      await accessory.initialize();
      processStatusMessage = mqttApiManagerMock.subscribeOnStatusMessage.mock.calls[0][1]!;
    });

    it('should update status of all services when status message is received with value Online (1)', async () => {
      const message = { params: { status: EnableType.On } } as MqttStatusMessage;
      processStatusMessage(message);

      expect(batteryStatusServiceMock.updateReachability).toHaveBeenCalledWith(true);
      expect(accessoryInformationServiceMock.updateReachability).toHaveBeenCalledWith(true);
    });

    it('should update status of all services when status message is received with value Offline (0)', async () => {
      const message = { params: { status: EnableType.Off } } as MqttStatusMessage;
      processStatusMessage(message);

      expect(batteryStatusServiceMock.updateReachability).toHaveBeenCalledWith(false);
      expect(accessoryInformationServiceMock.updateReachability).toHaveBeenCalledWith(false);
    });
  });

  describe('destroy', () => {
    let quotaSubscriptionMock: jest.Mocked<Subscription>;
    let setReplySubscriptionMock: jest.Mocked<Subscription>;
    let statusSubscriptionMock: jest.Mocked<Subscription>;

    beforeEach(() => {
      quotaSubscriptionMock = { unsubscribe: jest.fn() } as unknown as jest.Mocked<Subscription>;
      setReplySubscriptionMock = { unsubscribe: jest.fn() } as unknown as jest.Mocked<Subscription>;
      statusSubscriptionMock = { unsubscribe: jest.fn() } as unknown as jest.Mocked<Subscription>;
      mqttApiManagerMock.subscribeOnQuotaMessage.mockReturnValueOnce(quotaSubscriptionMock);
      mqttApiManagerMock.subscribeOnSetReplyMessage.mockReturnValueOnce(setReplySubscriptionMock);
      mqttApiManagerMock.subscribeOnStatusMessage.mockReturnValueOnce(statusSubscriptionMock);

      config.reconnectMqttTimeoutMs = 100;
    });

    it('should stop mqtt reconnection when destroying accessory', async () => {
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(false);
      await accessory.initialize();
      await waitMqttReconnection(1);

      await accessory.destroy();
      await waitMqttReconnection(2);

      expect(mqttApiManagerMock.subscribeOnQuotaTopic).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe from parameters updates when destroying accessory', async () => {
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);
      await accessory.initialize();

      await accessory.destroy();

      expect(quotaSubscriptionMock.unsubscribe).toHaveBeenCalledTimes(1);
      expect(setReplySubscriptionMock.unsubscribe).toHaveBeenCalledTimes(1);
      expect(statusSubscriptionMock.unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupServices', () => {
    beforeEach(() => {
      Object.defineProperty(batteryStatusServiceMock, 'service', {
        get: jest.fn().mockReturnValue(new HapService('Battery', HapService.Battery.UUID)),
        configurable: true,
      });
      Object.defineProperty(accessoryInformationServiceMock, 'service', {
        get: jest.fn().mockReturnValue(new HapService('Information', HapService.AccessoryInformation.UUID)),
        configurable: true,
      });
      accessoryMock.services = [batteryStatusServiceMock.service, accessoryInformationServiceMock.service];
    });

    it('should remove non registered services when cleanup is called', async () => {
      await accessory.initialize();
      const redundantService1 = new HapService('Assistant', HapService.Assistant.UUID);
      const redundantService2 = new HapService('Contact Sensor', HapService.ContactSensor.UUID);
      const redundantService3 = new HapService('CarbonDioxideSensor', HapService.CarbonDioxideSensor.UUID);
      redundantService2.displayName = '';
      redundantService2.name = 'CS';
      accessoryMock.services.push(redundantService1, redundantService2, redundantService3);
      redundantService3.displayName = undefined as unknown as string;
      redundantService3.name = 'Carbon';

      accessory.cleanupServices();
      const actual = getActualServices(accessory);

      expect(actual).toEqual(expectedServices);
      expect(accessoryMock.removeService.mock.calls).toEqual([
        [redundantService1],
        [redundantService2],
        [redundantService3],
      ]);
      expect(logMock.warn.mock.calls).toEqual([
        ['Removing obsolete service from accessory:', 'Assistant'],
        ['Removing obsolete service from accessory:', 'CS'],
        ['Removing obsolete service from accessory:', 'Carbon'],
      ]);
    });

    it('should cleanup characteristics for registered services only when cleanup is called', async () => {
      await accessory.initialize();

      accessory.cleanupServices();

      accessory.services.forEach(service => {
        expect(service.cleanupCharacteristics).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('sendSetCommand', () => {
    let revertMock: jest.Mock;
    let updateReachabilityMock: jest.Mock;
    beforeEach(async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.6);
      revertMock = jest.fn();
      updateReachabilityMock = jest.fn();
      accessory.batteryService.updateReachability = updateReachabilityMock;

      await accessory.initialize();
    });

    it('should send mqtt "set" message when sending of command is requested', async () => {
      const expectedMessage: MqttSetMessage = {
        id: 600000,
        version: '1.0',
      };
      await accessory.sendSetCommand(expectedMessage, revertMock);

      expect(mqttApiManagerMock.sendSetCommand).toHaveBeenCalledWith(deviceInfo, expectedMessage);
      expect(revertMock).not.toHaveBeenCalled();
    });

    it('should revert sent command when its sending is timed out', async () => {
      const expectedMessage: MqttSetMessage = {
        id: 600000,
        version: '1.0',
      };

      await accessory.sendSetCommand(expectedMessage, revertMock);
      await waitSetReplyTimeout();

      expect(revertMock).toHaveBeenCalledTimes(1);
    });

    it("should log timed out warning when command's sending is timed out", async () => {
      const expectedMessage: MqttSetMessage = {
        id: 600000,
        version: '1.0',
      };

      await accessory.sendSetCommand(expectedMessage, revertMock);
      await waitSetReplyTimeout();

      expect(logMock.warn.mock.calls).toEqual([
        ['Sending of command is timed out. Reverts value back for:', 600000],
        ['Device is offline'],
      ]);
      expect(updateReachabilityMock).toHaveBeenCalledWith(false);
    });

    it("should mark all accessory's services as unreachable when command's sending is timed out", async () => {
      const expectedMessage: MqttSetMessage = {
        id: 600000,
        version: '1.0',
      };

      await accessory.sendSetCommand(expectedMessage, revertMock);
      await waitSetReplyTimeout();

      expect(updateReachabilityMock).toHaveBeenCalledWith(false);
    });

    it("should remove message from setReply dictionary when command's sending is timed out", async () => {
      const expectedMessage: MqttSetMessage = {
        id: 600000,
        version: '1.0',
      };

      await accessory.sendSetCommand(expectedMessage, revertMock);
      await waitSetReplyTimeout();

      expect(Object.keys(accessory.setReplies).length).toBe(0);
    });

    it('should ignore timed out message when it is already processed', async () => {
      const expectedMessage: MqttSetMessage = {
        id: 600000,
        version: '1.0',
      };

      await accessory.sendSetCommand(expectedMessage, revertMock);
      delete accessory.setReplies['600000'];
      await waitSetReplyTimeout();

      expect(logMock.debug).toHaveBeenCalledWith('Timed out message is already processed. Ignore it:', 600000);
    });

    it('should use default value of setReplyWaitResponseTimeoutMs when it is not set in config', async () => {
      const expectedMessage: MqttSetMessage = {
        id: 600000,
        version: '1.0',
      };
      config.setReplyWaitResponseTimeoutMs = undefined;

      await accessory.sendSetCommand(expectedMessage, revertMock);
      await sleep(3100);

      expect(Object.keys(accessory.setReplies).length).toBe(0);
    });
  });
});
