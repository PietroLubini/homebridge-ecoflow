import { DiscoveryAccessory } from '@ecoflow/accessories/discovery/discoveryAccessory';
import { DiscoveryAllQuotaData } from '@ecoflow/accessories/discovery/interfaces/discoveryHttpApiContracts';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig } from '@ecoflow/config';
import { getActualServices, MockService } from '@ecoflow/helpers/tests/accessoryTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

jest.mock('@ecoflow/services/accessoryInformationService');

describe('DiscoveryAccessory', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;
  let accessory: DiscoveryAccessory;
  let accessoryInformationServiceMock: jest.Mocked<AccessoryInformationService>;
  const expectedServices: MockService[] = [
    {
      Name: 'AccessoryInformationService',
    },
  ];

  beforeEach(() => {
    function createService<TService extends ServiceBase>(service: TService): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<ServiceBase>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      return serviceMock;
    }

    accessoryInformationServiceMock = createService(new AccessoryInformationService(accessory));
    (AccessoryInformationService as jest.Mock).mockImplementation(() => accessoryInformationServiceMock);

    accessoryMock = { services: jest.fn(), removeService: jest.fn() } as unknown as jest.Mocked<PlatformAccessory>;
    platformMock = {} as unknown as jest.Mocked<EcoFlowHomebridgePlatform>;
    logMock = { info: jest.fn() } as unknown as jest.Mocked<Logging>;
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
    config = { secretKey: 'secretKey1', accessKey: 'accessKey1', serialNumber: 'sn1' } as unknown as DeviceConfig;
    accessory = new DiscoveryAccessory(
      platformMock,
      accessoryMock,
      config,
      logMock,
      httpApiManagerMock,
      mqttApiManagerMock
    );
  });

  describe('initialize', () => {
    it('should add required services when initializing accessory', async () => {
      await accessory.initialize();
      const actual = getActualServices(accessory);

      expect(actual).toEqual(expectedServices);
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('processQuotaMessage', () => {
    let quota: DiscoveryAllQuotaData;

    beforeEach(() => {
      quota = {} as DiscoveryAllQuotaData;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);
    });

    describe('Default', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should log quota when any message is received', async () => {
        const message = {
          param: {
            watts: 34.67,
            soc: 67.4,
          },
        };

        processQuotaMessage(message);

        expect(logMock.info.mock.calls).toEqual([
          ['Received quota: {\n  "param": {\n    "watts": 34.67,\n    "soc": 67.4\n  }\n}'],
        ]);
      });
    });
  });

  describe('initializeQuota', () => {
    let quota: DiscoveryAllQuotaData;
    beforeEach(() => {
      quota = {
        watts: 134.67,
        soc: 17.4,
      };
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: DiscoveryAllQuotaData = {};

      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    it('should log quota when initializing default values', async () => {
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

      await accessory.initializeDefaultValues();

      expect(logMock.info.mock.calls).toEqual([['Received quota (initial): {\n  "watts": 134.67,\n  "soc": 17.4\n}']]);
    });
  });
});
