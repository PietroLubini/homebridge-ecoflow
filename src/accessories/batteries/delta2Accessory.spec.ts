import { BatteryAllQuotaData, BmsStatus, InvStatus, PdStatus } from '@ecoflow/accessories/batteries/batteryAccessory';
import { Delta2Accessory } from '@ecoflow/accessories/batteries/delta2Accessory';
import { EcoFlowHttpApi } from '@ecoflow/apis/ecoFlowHttpApi';
import {
  EcoFlowMqttApi,
  MqttMessageType,
  MqttQuotaMessage,
  MqttQuotaMessageWithParams,
  MqttSetMessageWithParams,
  MqttSetReplyMessage,
} from '@ecoflow/apis/ecoFlowMqttApi';
import { DeviceConfig } from '@ecoflow/config';
import { getActualServices, MockService } from '@ecoflow/helpers/tests/accessoryTestHelper';
import { sleep } from '@ecoflow/helpers/tests/sleep';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { OutletAcService } from '@ecoflow/services/outletAcService';
import { OutletCarService } from '@ecoflow/services/outletCarService';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';
import { OutletUsbService } from '@ecoflow/services/outletUsbService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Service as HapService } from 'hap-nodejs';
import { Logging, PlatformAccessory } from 'homebridge';
import { Observable, Subscription } from 'rxjs';

jest.mock('@ecoflow/services/batteryStatusService');
jest.mock('@ecoflow/services/outletUsbService');
jest.mock('@ecoflow/services/outletAcService');
jest.mock('@ecoflow/services/outletCarService');
jest.mock('@ecoflow/services/accessoryInformationService');

describe('Delta2Accessory', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiMock: jest.Mocked<EcoFlowHttpApi>;
  let mqttApiMock: jest.Mocked<EcoFlowMqttApi>;
  let config: DeviceConfig;
  let accessory: Delta2Accessory;
  let batteryStatusServiceMock: jest.Mocked<BatteryStatusService>;
  let outletUsbServiceMock: jest.Mocked<OutletUsbService>;
  let outletAcServiceMock: jest.Mocked<OutletAcService<BatteryAllQuotaData>>;
  let outletCarServiceMock: jest.Mocked<OutletCarService>;
  let accessoryInformationServiceMock: jest.Mocked<AccessoryInformationService>;
  let quotaMock: jest.Mocked<Observable<MqttQuotaMessage>>;
  let setReplyMock: jest.Mocked<Observable<MqttSetReplyMessage>>;
  const expectedServices: MockService[] = [
    {
      Name: 'BatteryStatusService',
    },
    {
      Name: 'OutletUsbService',
    },
    {
      Name: 'OutletAcService',
    },
    {
      Name: 'OutletCarService',
    },
    {
      Name: 'AccessoryInformationService',
    },
  ];

  function waitMqttReconnection(attempts: number): Promise<void> {
    return sleep(config.reconnectMqttTimeoutMs! * (1 / 2 + attempts));
  }

  beforeEach(() => {
    function createService<TService extends ServiceBase, TModule extends ServiceBase>(
      Service: new (ecoFlowAccessory: Delta2Accessory) => TService,
      Module: new (ecoFlowAccessory: Delta2Accessory) => TModule,
      mockResetCallback: ((serviceMock: jest.Mocked<TService>) => void) | null = null
    ): jest.Mocked<TService> {
      const serviceMock = new Service(accessory) as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<ServiceBase>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      if (mockResetCallback) {
        mockResetCallback(serviceMock);
      }
      (Module as jest.Mock).mockImplementation(() => serviceMock);
      return serviceMock;
    }

    function createOutletService<TService extends OutletServiceBase, TModule extends OutletServiceBase>(
      Service: new (ecoFlowAccessory: Delta2Accessory) => TService,
      Module: new (ecoFlowAccessory: Delta2Accessory) => TModule
    ): jest.Mocked<TService> {
      return createService(Service, Module, mock => {
        const mockOutletBase = mock as jest.Mocked<OutletServiceBase>;
        mockOutletBase.updateBatteryLevel.mockReset();
        mockOutletBase.updateInputConsumption.mockReset();
        mockOutletBase.updateOutputConsumption.mockReset();
        mockOutletBase.updateState.mockReset();
      });
    }
    batteryStatusServiceMock = createService(BatteryStatusService, BatteryStatusService, mock => {
      mock.updateBatteryLevel.mockReset();
      mock.updateChargingState.mockReset();
      mock.updateStatusLowBattery.mockReset();
    });
    outletUsbServiceMock = createOutletService(OutletUsbService, OutletUsbService);
    outletAcServiceMock = createOutletService(OutletAcService, OutletAcService<BatteryAllQuotaData>);
    outletCarServiceMock = createOutletService(OutletCarService, OutletCarService);
    accessoryInformationServiceMock = createService(AccessoryInformationService, AccessoryInformationService);

    accessoryMock = { services: jest.fn(), removeService: jest.fn() } as unknown as jest.Mocked<PlatformAccessory>;
    platformMock = {} as unknown as jest.Mocked<EcoFlowHomebridgePlatform>;
    logMock = { debug: jest.fn(), warn: jest.fn() } as unknown as jest.Mocked<Logging>;
    httpApiMock = {
      getAllQuotas: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowHttpApi>;
    quotaMock = { subscribe: jest.fn() } as unknown as jest.Mocked<Observable<MqttQuotaMessage>>;
    setReplyMock = { subscribe: jest.fn() } as unknown as jest.Mocked<Observable<MqttSetReplyMessage>>;
    mqttApiMock = {
      destroy: jest.fn(),
      quota$: quotaMock,
      setReply$: setReplyMock,
      subscribeOnQuota: jest.fn(),
      subscribeOnSetReply: jest.fn(),
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowMqttApi>;
    config = { secretKey: 'secretKey1', accessKey: 'accessKey1', serialNumber: 'sn1' } as unknown as DeviceConfig;
    accessory = new Delta2Accessory(platformMock, accessoryMock, config, logMock, httpApiMock, mqttApiMock, false);
  });

  describe('initialize', () => {
    it('should add required services when initializing accessory', async () => {
      await accessory.initialize();
      const actual = getActualServices(accessory);

      expect(actual).toEqual(expectedServices);
      expect(batteryStatusServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(outletUsbServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(outletAcServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(outletCarServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });

    it('should subscribe on parameters updates when initializing accessory', async () => {
      const quotaSubscriptionMock = jest.fn() as unknown as jest.Mocked<Subscription>;
      quotaMock.subscribe.mockReturnValueOnce(quotaSubscriptionMock);
      const setReplySubscriptionMock = jest.fn() as unknown as jest.Mocked<Subscription>;
      setReplyMock.subscribe.mockReturnValueOnce(setReplySubscriptionMock);

      await accessory.initialize();

      expect(quotaMock.subscribe).toHaveBeenCalledTimes(1);
      expect(setReplyMock.subscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('connectMqtt', () => {
    beforeEach(() => {
      config.reconnectMqttTimeoutMs = 100;
      accessory = new Delta2Accessory(platformMock, accessoryMock, config, logMock, httpApiMock, mqttApiMock, false);
    });

    it('should connect to mqtt server during initialization when subscription to quota and set_reply topic is successful', async () => {
      mqttApiMock.subscribeOnQuota.mockResolvedValue(true);
      mqttApiMock.subscribeOnSetReply.mockResolvedValue(true);

      await accessory.initialize();
      await waitMqttReconnection(1);

      expect(mqttApiMock.subscribeOnQuota).toHaveBeenCalledTimes(1);
      expect(mqttApiMock.subscribeOnQuota).toHaveBeenCalledWith('sn1');
      expect(mqttApiMock.subscribeOnSetReply).toHaveBeenCalledTimes(1);
      expect(mqttApiMock.subscribeOnSetReply).toHaveBeenCalledWith('sn1');
    });

    it('should re-connect to mqtt server when subscription to quota was failed during initialization', async () => {
      mqttApiMock.subscribeOnQuota
        .mockImplementationOnce(() => Promise.resolve(false))
        .mockImplementationOnce(() => Promise.resolve(true));
      mqttApiMock.subscribeOnSetReply.mockResolvedValue(true);

      await accessory.initialize();
      await waitMqttReconnection(1);

      expect(mqttApiMock.subscribeOnQuota).toHaveBeenCalledTimes(2);
      expect(mqttApiMock.subscribeOnSetReply).toHaveBeenCalledTimes(1);
    });

    it('should re-connect to mqtt server when subscription to set_reply was failed during initialization', async () => {
      mqttApiMock.subscribeOnQuota.mockResolvedValue(true);
      mqttApiMock.subscribeOnSetReply
        .mockImplementationOnce(() => Promise.resolve(false))
        .mockImplementationOnce(() => Promise.resolve(true));

      await accessory.initialize();
      await waitMqttReconnection(1);

      expect(mqttApiMock.subscribeOnQuota).toHaveBeenCalledTimes(2);
      expect(mqttApiMock.subscribeOnSetReply).toHaveBeenCalledTimes(2);
    });
  });

  describe('processQuotaMessage', () => {
    let quota: BatteryAllQuotaData;
    beforeEach(() => {
      const quotaSubscriptionMock = jest.fn() as unknown as jest.Mocked<Subscription>;
      const setReplySubscriptionMock = jest.fn() as unknown as jest.Mocked<Subscription>;
      quotaMock.subscribe.mockReturnValueOnce(quotaSubscriptionMock);
      setReplyMock.subscribe.mockReturnValueOnce(setReplySubscriptionMock);
      quota = {} as BatteryAllQuotaData;
      httpApiMock.getAllQuotas.mockResolvedValueOnce(quota);
    });

    describe('BmsStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.bms_bmsStatus = {} as BmsStatus;
        await accessory.initialize();
        processQuotaMessage = quotaMock.subscribe.mock.calls[0][0]!;
      });

      it('should update bms status in quota when BmsStatus message is received', async () => {
        const message: MqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: MqttMessageType.BMS,
          params: {
            f32ShowSoc: 34.67,
          },
        };

        processQuotaMessage(message);
        const actual = quota.bms_bmsStatus;

        expect(actual).toEqual(message.params);
        expect(logMock.debug).toHaveBeenCalledWith('BMS:', message.params);
      });

      it('should update battery level when BmsStatus message is received with f32ShowSoc', async () => {
        const message: MqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: MqttMessageType.BMS,
          params: {
            f32ShowSoc: 34.67,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateStatusLowBattery).toHaveBeenCalledWith(34.67);
        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67);
        expect(outletAcServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67);
        expect(outletUsbServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67);
        expect(outletCarServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67);
      });

      it('should not update any characteristic when BmsStatus message is received with undefined status', async () => {
        const message: MqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: MqttMessageType.BMS,
          params: {} as BmsStatus,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateStatusLowBattery).not.toHaveBeenCalled();
        expect(batteryStatusServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
      });
    });

    describe('InvStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.inv = {} as InvStatus;
        await accessory.initialize();
        processQuotaMessage = quotaMock.subscribe.mock.calls[0][0]!;
      });

      it('should update inv status in quota when InvStatus message is received', async () => {
        const message: MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttMessageType.INV,
          params: {
            inputWatts: 12.34,
          },
        };

        processQuotaMessage(message);
        const actual = quota.inv;

        expect(actual).toEqual(message.params);
        expect(logMock.debug).toHaveBeenCalledWith('INV:', message.params);
      });

      it('should update AC, USB, CAR input consumptions when InvStatus message is received with inputWatts', async () => {
        const message: MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttMessageType.INV,
          params: {
            inputWatts: 12.34,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(12.34);
        expect(outletAcServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
        expect(outletUsbServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
        expect(outletCarServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
      });

      it('should update AC state when InvStatus message is received with cfgAcEnabled', async () => {
        const message: MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttMessageType.INV,
          params: {
            cfgAcEnabled: true,
          } as InvStatus,
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update AC output watts consumption when InvStatus message is received with outputWatts', async () => {
        const message: MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttMessageType.INV,
          params: {
            outputWatts: 45.67,
          } as InvStatus,
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(45.67);
      });

      it('should not update any characteristic when InvStatus message is received with undefined status', async () => {
        const message: MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttMessageType.INV,
          params: {} as InvStatus,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateInputConsumption).not.toHaveBeenCalled();
      });
    });

    describe('PdStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.pd = {} as PdStatus;
        await accessory.initialize();
        processQuotaMessage = quotaMock.subscribe.mock.calls[0][0]!;
      });

      it('should update pd status in quota when PdStatus message is received', async () => {
        const message: MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttMessageType.PD,
          params: {
            carWatts: 34.12,
          },
        };

        processQuotaMessage(message);
        const actual = quota.pd;

        expect(actual).toEqual(message.params);
        expect(logMock.debug).toHaveBeenCalledWith('PD:', message.params);
      });

      it('should update CAR state when PdStatus message is received with carState', async () => {
        const message: MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttMessageType.PD,
          params: {
            carState: true,
          },
        };

        processQuotaMessage(message);

        expect(outletCarServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update CAR output consumption when PdStatus message is received with carWatts', async () => {
        const message: MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttMessageType.PD,
          params: {
            carWatts: 64.89,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletCarServiceMock.updateOutputConsumption).toHaveBeenCalledWith(64.89);
      });

      it('should update USB state when PdStatus message is received with dcOutState', async () => {
        const message: MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttMessageType.PD,
          params: {
            dcOutState: true,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update USB output consumption when PdStatus message is received with usb1Watts', async () => {
        const message: MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttMessageType.PD,
          params: {
            usb1Watts: 1.1,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(1.1);
      });

      it('should update USB output consumption when PdStatus message is received with usb2Watts', async () => {
        const message: MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttMessageType.PD,
          params: {
            usb2Watts: 2.2,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.2);
      });

      it('should update USB output consumption when PdStatus message is received with qcUsb1Watts', async () => {
        const message: MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttMessageType.PD,
          params: {
            qcUsb1Watts: 3.3,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(3.3);
      });

      it('should update USB output consumption when PdStatus message is received with qcUsb2Watts', async () => {
        const message: MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttMessageType.PD,
          params: {
            qcUsb2Watts: 4.4,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(4.4);
      });

      it('should update USB output consumption when PdStatus message is received with typec1Watts', async () => {
        const message: MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttMessageType.PD,
          params: {
            typec1Watts: 5.5,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(5.5);
      });

      it('should update USB output consumption when PdStatus message is received with typec2Watts', async () => {
        const message: MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttMessageType.PD,
          params: {
            typec2Watts: 6.6,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(6.6);
      });

      it('should update USB output consumption when PdStatus message is received with all usb-related parameters', async () => {
        const message: MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttMessageType.PD,
          params: {
            usb1Watts: 1.1,
            usb2Watts: 2.2,
            qcUsb1Watts: 3.3,
            qcUsb2Watts: 4.4,
            typec1Watts: 5.5,
            typec2Watts: 6.6,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(23.1);
      });

      it('should not update any characteristic when PdStatus message is received with undefined status', async () => {
        const message: MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttMessageType.PD,
          params: {} as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletCarServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });
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
        operateType: 'operateType1',
        version: 'version1',
        data: { ack: false },
      };
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      await accessory.initialize();
      processSetReplyMessage = setReplyMock.subscribe.mock.calls[0][0]!;
    });

    it("should ignore 'set_reply' message when no 'set' command was sent yet", () => {
      processSetReplyMessage(message);

      expect(logMock.debug).toHaveBeenCalledWith(
        'Received "SetReply" response was sent from another instance of homebridge. Ignore it:',
        message
      );
    });

    it("should ignore 'set_reply' message when it was not initialized by 'set' command from current instance", async () => {
      await accessory.sendSetCommand(123, 'operateType2', {}, revertMock);
      processSetReplyMessage(message);

      expect(logMock.debug).toHaveBeenCalledWith(
        'Received "SetReply" response was sent from another instance of homebridge. Ignore it:',
        message
      );
    });

    it("should do nothing when 'set_reply' message contains successful acknowledge", async () => {
      await accessory.sendSetCommand(123, 'operateType1', {}, revertMock);
      message.data.ack = false;
      processSetReplyMessage(message);

      expect(revertMock).not.toHaveBeenCalled();
      expect(logMock.debug).toHaveBeenCalledWith('Setting of a value was successful for:', 'operateType1');
    });

    it("should call revert function when 'set_reply' message contains failed acknowledge", async () => {
      await accessory.sendSetCommand(123, 'operateType1', {}, revertMock);
      message.data.ack = true;
      processSetReplyMessage(message);

      expect(revertMock).toHaveBeenCalledTimes(1);
      expect(logMock.warn).toHaveBeenCalledWith('Failed to set a value. Reverts value back for:', 'operateType1');
    });
  });

  describe('updateInitialValues', () => {
    let quota: BatteryAllQuotaData;
    beforeEach(() => {
      const quotaSubscriptionMock = jest.fn() as unknown as jest.Mocked<Subscription>;
      const setReplySubscriptionMock = jest.fn() as unknown as jest.Mocked<Subscription>;
      quotaMock.subscribe.mockReturnValueOnce(quotaSubscriptionMock);
      setReplyMock.subscribe.mockReturnValueOnce(setReplySubscriptionMock);
      quota = {
        bms_bmsStatus: {
          f32ShowSoc: 1.1,
        },
        inv: {
          inputWatts: 2.1,
          cfgAcEnabled: true,
          outputWatts: 2.2,
        },
        pd: {
          carState: true,
          carWatts: 3.1,
          dcOutState: false,
          qcUsb1Watts: 4,
          typec2Watts: 5,
        },
      };
      httpApiMock.getAllQuotas.mockResolvedValueOnce(quota);
      accessory = new Delta2Accessory(platformMock, accessoryMock, config, logMock, httpApiMock, mqttApiMock);
    });

    describe('BmsStatus', () => {
      it('should update bms status in quota when BmsStatus message is received', async () => {
        await accessory.initialize();

        expect(logMock.debug).toHaveBeenCalledWith('BMS:', quota.bms_bmsStatus);
        expect(batteryStatusServiceMock.updateStatusLowBattery).toHaveBeenCalledWith(1.1);
        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1);
        expect(outletAcServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1);
        expect(outletUsbServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1);
        expect(outletCarServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1);
      });
    });

    describe('InvStatus', () => {
      it('should update inv status in quota when InvStatus message is received', async () => {
        await accessory.initialize();

        expect(logMock.debug).toHaveBeenCalledWith('INV:', quota.inv);
        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(2.1);
        expect(outletAcServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.1);
        expect(outletAcServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.2);
        expect(outletUsbServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.1);
        expect(outletCarServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.1);
      });
    });

    describe('PdStatus', () => {
      it('should update pd status in quota when PdStatus message is received', async () => {
        await accessory.initialize();

        expect(logMock.debug).toHaveBeenCalledWith('PD:', quota.pd);
        expect(outletUsbServiceMock.updateState).toHaveBeenCalledWith(false);
        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(9);
        expect(outletCarServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(outletCarServiceMock.updateOutputConsumption).toHaveBeenCalledWith(3.1);
      });
    });
  });

  describe('destroy', () => {
    let quotaSubscriptionMock: jest.Mocked<Subscription>;
    let setReplySubscriptionMock: jest.Mocked<Subscription>;

    beforeEach(() => {
      quotaSubscriptionMock = { unsubscribe: jest.fn() } as unknown as jest.Mocked<Subscription>;
      quotaMock.subscribe.mockReturnValueOnce(quotaSubscriptionMock);
      setReplySubscriptionMock = { unsubscribe: jest.fn() } as unknown as jest.Mocked<Subscription>;
      setReplyMock.subscribe.mockReturnValueOnce(setReplySubscriptionMock);

      config.reconnectMqttTimeoutMs = 100;
      accessory = new Delta2Accessory(platformMock, accessoryMock, config, logMock, httpApiMock, mqttApiMock, false);
    });

    it('should stop mqtt reconnection when destroying accessory', async () => {
      mqttApiMock.subscribeOnQuota.mockResolvedValue(false);
      await accessory.initialize();
      await waitMqttReconnection(1);

      await accessory.destroy();
      await waitMqttReconnection(2);

      expect(mqttApiMock.subscribeOnQuota).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe from parameters updates when destroying accessory', async () => {
      await accessory.initialize();

      await accessory.destroy();

      expect(quotaSubscriptionMock.unsubscribe).toHaveBeenCalledTimes(1);
      expect(setReplySubscriptionMock.unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupServices', () => {
    beforeEach(() => {
      if (!batteryStatusServiceMock.service) {
        Object.defineProperty(batteryStatusServiceMock, 'service', {
          get: jest.fn().mockReturnValue(new HapService('Battery', HapService.Battery.UUID)),
        });
      }
      if (!outletAcServiceMock.service) {
        Object.defineProperty(outletAcServiceMock, 'service', {
          get: jest.fn().mockReturnValue(new HapService('Outlet AC', HapService.Outlet.UUID)),
        });
      }
      if (!outletUsbServiceMock.service) {
        Object.defineProperty(outletUsbServiceMock, 'service', {
          get: jest.fn().mockReturnValue(new HapService('Outlet USB', HapService.Outlet.UUID)),
        });
      }
      if (!outletCarServiceMock.service) {
        Object.defineProperty(outletCarServiceMock, 'service', {
          get: jest.fn().mockReturnValue(new HapService('Outlet CAR', HapService.Outlet.UUID)),
        });
      }
      if (!accessoryInformationServiceMock.service) {
        Object.defineProperty(accessoryInformationServiceMock, 'service', {
          get: jest.fn().mockReturnValue(new HapService('Information', HapService.AccessoryInformation.UUID)),
        });
      }
      accessoryMock.services = [
        batteryStatusServiceMock.service,
        outletAcServiceMock.service,
        outletUsbServiceMock.service,
        outletCarServiceMock.service,
        accessoryInformationServiceMock.service,
      ];
    });

    it('should remove non registered services when cleanup is called', async () => {
      await accessory.initialize();
      const redundantService1 = new HapService('Assistant', HapService.Assistant.UUID);
      const redundantService2 = new HapService('Contact Sensor', HapService.ContactSensor.UUID);
      accessoryMock.services.push(redundantService1, redundantService2);

      accessory.cleanupServices();
      const actual = getActualServices(accessory);

      expect(actual).toEqual(expectedServices);
      expect(accessoryMock.removeService.mock.calls).toEqual([[redundantService1], [redundantService2]]);
      expect(logMock.warn.mock.calls).toEqual([
        ['Removing obsolete service from accessory:', 'Assistant'],
        ['Removing obsolete service from accessory:', 'Contact Sensor'],
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
    beforeEach(() => {
      revertMock = jest.fn();
      jest.spyOn(Math, 'random').mockReturnValue(0.6);
    });

    it('should stop mqtt reconnection when destroying accessory', async () => {
      const expectedMessage: MqttSetMessageWithParams<BmsStatus> = {
        id: 600000,
        operateType: 'operateType10',
        version: '1.0',
        moduleType: 123,
        params: {
          f32ShowSoc: 34,
        },
      };
      await accessory.sendSetCommand(
        123,
        'operateType10',
        {
          f32ShowSoc: 34,
        },
        revertMock
      );
      expect(mqttApiMock.sendSetCommand).toHaveBeenCalledWith('sn1', expectedMessage);
    });
  });
});
