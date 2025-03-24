import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { Heartbeat, SmartPlugAllQuotaData } from '@ecoflow/accessories/smartplug/interfaces/smartPlugHttpApiContracts';
import {
  SmartPlugMqttMessageFuncType,
  SmartPlugMqttMessageType,
  SmartPlugMqttQuotaMessageWithParams,
} from '@ecoflow/accessories/smartplug/interfaces/smartPlugMqttApiContracts';
import { BrightnessService } from '@ecoflow/accessories/smartplug/services/brightnessService';
import { OutletService } from '@ecoflow/accessories/smartplug/services/outletService';
import { SmartPlugAccessory } from '@ecoflow/accessories/smartplug/smartPlugAccessory';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import {
  AdditionalBatteryCharacteristicType as CharacteristicType,
  DeviceConfig,
  AdditionalOutletCharacteristicType as OutletCharacteristicType,
} from '@ecoflow/config';
import { getActualServices, MockService } from '@ecoflow/helpers/tests/accessoryTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { LightBulbServiceBase } from '@ecoflow/services/lightBulbServiceBase';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { TemperatureSensorService } from '@ecoflow/services/temperatureSensorService';
import { Logging, PlatformAccessory } from 'homebridge';

jest.mock('@ecoflow/accessories/smartplug/services/outletService');
jest.mock('@ecoflow/accessories/smartplug/services/brightnessService');
jest.mock('@ecoflow/services/temperatureSensorService');
jest.mock('@ecoflow/services/accessoryInformationService');

describe('PowerStreamAccessory', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;
  let accessory: SmartPlugAccessory;
  let outletServiceMock: jest.Mocked<OutletService>;
  let brightnessServiceMock: jest.Mocked<BrightnessService>;
  let temperatureServiceMock: jest.Mocked<TemperatureSensorService>;
  let accessoryInformationServiceMock: jest.Mocked<AccessoryInformationService>;
  const expectedServices: MockService[] = [
    {
      Name: 'OutletService',
    },
    {
      Name: 'TemperatureSensorService',
    },
    {
      Name: 'BrightnessService',
    },
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

    function createOutletService<TService extends OutletServiceBase>(service: TService): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<OutletServiceBase>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      serviceBaseMock.updateOutputConsumption.mockReset();
      serviceBaseMock.updateOutputCurrent.mockReset();
      serviceBaseMock.updateOutputVoltage.mockReset();
      serviceBaseMock.updateState.mockReset();
      return serviceMock;
    }

    function createLightBulbService<TService extends LightBulbServiceBase>(service: TService): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<LightBulbServiceBase>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      serviceBaseMock.updateBrightness.mockReset();
      serviceBaseMock.updateState.mockReset();
      return serviceMock;
    }

    function createTemperatureSensorService<TService extends TemperatureSensorService>(
      service: TService
    ): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<TemperatureSensorService>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      serviceBaseMock.updateCurrentTemperature.mockReset();
      return serviceMock;
    }

    outletServiceMock = createOutletService(new OutletService(accessory));
    (OutletService as unknown as jest.Mock).mockImplementation(() => outletServiceMock);

    brightnessServiceMock = createLightBulbService(new BrightnessService(accessory, 1023));
    (BrightnessService as jest.Mock).mockImplementation(() => brightnessServiceMock);

    temperatureServiceMock = createTemperatureSensorService(new TemperatureSensorService(accessory));
    (TemperatureSensorService as jest.Mock).mockImplementation(() => temperatureServiceMock);

    accessoryInformationServiceMock = createService(new AccessoryInformationService(accessory));
    (AccessoryInformationService as jest.Mock).mockImplementation(() => accessoryInformationServiceMock);

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
      subscribeOnQuotaMessage: jest.fn(),
      subscribeOnSetReplyMessage: jest.fn(),
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowMqttApiManager>;
    config = { secretKey: 'secretKey1', accessKey: 'accessKey1', serialNumber: 'sn1' } as unknown as DeviceConfig;
    accessory = new SmartPlugAccessory(
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
      expect(outletServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(brightnessServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(temperatureServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });

    describe('outletServices', () => {
      function run<TService>(
        mock: jest.Mocked<TService>,
        deviceConfig: DeviceConfig
      ): CharacteristicType[] | undefined {
        let actual: CharacteristicType[] | undefined;
        (OutletService as unknown as jest.Mock).mockImplementation(
          (_: EcoFlowAccessoryBase, additionalCharacteristics?: CharacteristicType[]) => {
            actual = additionalCharacteristics;
            return mock;
          }
        );
        new SmartPlugAccessory(
          platformMock,
          accessoryMock,
          deviceConfig,
          logMock,
          httpApiManagerMock,
          mqttApiManagerMock
        );
        return actual;
      }

      describe('additionalCharacteristics', () => {
        it('should initialize outlet service with additional characteristics when settings are defined in config', () => {
          const actual = run(outletServiceMock, {
            outlet: {
              additionalCharacteristics: [OutletCharacteristicType.OutputConsumptionInWatts],
            },
          } as DeviceConfig);

          expect(actual).toEqual([OutletCharacteristicType.OutputConsumptionInWatts]);
        });

        it('should initialize outlet service without additional characteristics when settings are not defined in config', () => {
          const actual = run(outletServiceMock, {
            outlet: {},
          } as DeviceConfig);

          expect(actual).toBeUndefined();
        });

        it('should notinitialize outlet service without additional characteristics when outlet settings are not defined in config', () => {
          const actual = run(outletServiceMock, {} as DeviceConfig);

          expect(actual).toBeUndefined();
        });
      });
    });

    describe('brightnessService', () => {
      function run(deviceConfig: DeviceConfig): number | undefined {
        let actual: number | undefined;
        (BrightnessService as jest.Mock).mockImplementation((_: EcoFlowAccessoryBase, maxBrightness: number) => {
          actual = maxBrightness;
          return brightnessServiceMock;
        });

        new SmartPlugAccessory(
          platformMock,
          accessoryMock,
          deviceConfig,
          logMock,
          httpApiManagerMock,
          mqttApiManagerMock
        );
        return actual;
      }

      describe('maxBrightness', () => {
        it('should initialize indicator service with permanent max brightness when it is created', () => {
          const actual = run(config);

          expect(actual).toEqual(1023);
        });
      });
    });
  });

  describe('processQuotaMessage', () => {
    let quota: SmartPlugAllQuotaData;

    beforeEach(() => {
      quota = {} as SmartPlugAllQuotaData;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
    });

    describe('Hearbeat', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota['2_1'] = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update heartbeat in quota when Hearbeat message is received', async () => {
        const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
          cmdFunc: SmartPlugMqttMessageFuncType.Func2,
          cmdId: SmartPlugMqttMessageType.Heartbeat,
          param: {
            watts: 34.67,
          },
        };

        processQuotaMessage(message);
        const actual = quota['2_1'];

        expect(actual).toEqual(message.param);
      });

      describe('updateOutletValues', () => {
        it('should not update outlet characteristics when Hearbeat message is received with undefined status', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {},
          };

          processQuotaMessage(message);

          expect(outletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
          expect(outletServiceMock.updateOutputCurrent).not.toHaveBeenCalled();
          expect(outletServiceMock.updateOutputVoltage).not.toHaveBeenCalled();
        });

        it('should update Output Consumption when Hearbeat message is received with 0 watts', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {
              watts: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
          expect(outletServiceMock.updateOutputCurrent).not.toHaveBeenCalled();
          expect(outletServiceMock.updateOutputVoltage).not.toHaveBeenCalled();
        });

        it('should update Output Consumption when Hearbeat message is received with watts', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {
              watts: 45,
            },
          };

          processQuotaMessage(message);

          expect(outletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(4.5);
          expect(outletServiceMock.updateOutputCurrent).not.toHaveBeenCalled();
          expect(outletServiceMock.updateOutputVoltage).not.toHaveBeenCalled();
        });

        it('should update Output Voltage when Hearbeat message is received with 0 volt', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {
              volt: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
          expect(outletServiceMock.updateOutputCurrent).not.toHaveBeenCalled();
          expect(outletServiceMock.updateOutputVoltage).toHaveBeenCalledWith(0);
        });

        it('should update Output Voltage when Hearbeat message is received with volt', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {
              volt: 56.1,
            },
          };

          processQuotaMessage(message);

          expect(outletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
          expect(outletServiceMock.updateOutputCurrent).not.toHaveBeenCalled();
          expect(outletServiceMock.updateOutputVoltage).toHaveBeenCalledWith(56.1);
        });

        it('should update Output Current when Hearbeat message is received with 0 current', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {
              current: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
          expect(outletServiceMock.updateOutputCurrent).toHaveBeenCalledWith(0);
          expect(outletServiceMock.updateOutputVoltage).not.toHaveBeenCalled();
        });

        it('should update Output Current when Hearbeat message is received with current', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {
              current: 2.5,
            },
          };

          processQuotaMessage(message);

          expect(outletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
          expect(outletServiceMock.updateOutputCurrent).toHaveBeenCalledWith(2.5);
          expect(outletServiceMock.updateOutputVoltage).not.toHaveBeenCalled();
        });
      });

      describe('updateBrightnessValues', () => {
        it('should not update brightness characteristics when Hearbeat message is received with undefined status', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {},
          };

          processQuotaMessage(message);

          expect(brightnessServiceMock.updateBrightness).not.toHaveBeenCalled();
          expect(brightnessServiceMock.updateState).not.toHaveBeenCalled();
        });

        it('should update Brightness when Hearbeat message is received with 0 brightness', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {
              brightness: 0,
            },
          };

          processQuotaMessage(message);

          expect(brightnessServiceMock.updateBrightness).toHaveBeenCalledWith(0);
          expect(brightnessServiceMock.updateState).toHaveBeenCalledWith(false);
        });

        it('should update Brightness when Hearbeat message is received with brightness', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {
              brightness: 45,
            },
          };

          processQuotaMessage(message);

          expect(brightnessServiceMock.updateBrightness).toHaveBeenCalledWith(45);
          expect(brightnessServiceMock.updateState).toHaveBeenCalledWith(true);
        });
      });

      describe('updateTemperatureValues', () => {
        it('should not update temperature service characteristics when Hearbeat message is received with undefined status', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {},
          };

          processQuotaMessage(message);

          expect(temperatureServiceMock.updateCurrentTemperature).not.toHaveBeenCalled();
        });

        it('should update CurrentTemperature when Hearbeat message is received with 0 temp', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {
              temp: 0,
            },
          };

          processQuotaMessage(message);

          expect(temperatureServiceMock.updateCurrentTemperature).toHaveBeenCalledWith(0);
        });

        it('should update CurrentTemperature when Hearbeat message is received with temp', async () => {
          const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: SmartPlugMqttMessageFuncType.Func2,
            cmdId: SmartPlugMqttMessageType.Heartbeat,
            param: {
              temp: 21.3,
            },
          };

          processQuotaMessage(message);

          expect(temperatureServiceMock.updateCurrentTemperature).toHaveBeenCalledWith(21.3);
        });
      });
    });
  });

  describe('initializeQuota', () => {
    let quota: SmartPlugAllQuotaData;
    beforeEach(() => {
      quota = {
        '2_1': {
          switchSta: true,
          watts: 21,
          current: 1.5,
          volt: 200.4,
          brightness: 789.3,
          temp: 36.6,
        },
      };
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: SmartPlugAllQuotaData = { '2_1': {} };

      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    describe('updateOutletValues', () => {
      it('should update outlet level-related characteristics when initializing default values', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(outletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.1);
        expect(outletServiceMock.updateOutputCurrent).toHaveBeenCalledWith(1.5);
        expect(outletServiceMock.updateOutputVoltage).toHaveBeenCalledWith(200.4);
      });

      it(`should update outlet level-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as SmartPlugAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(outletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletServiceMock.updateOutputCurrent).not.toHaveBeenCalled();
        expect(outletServiceMock.updateOutputVoltage).not.toHaveBeenCalled();
      });
    });

    describe('updateBrightnessValues', () => {
      it('should update brightness characteristic when initializing default values', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(brightnessServiceMock.updateBrightness).toHaveBeenCalledWith(789.3);
      });

      it(`should update brightness characteristic
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as SmartPlugAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(brightnessServiceMock.updateBrightness).not.toHaveBeenCalled();
      });
    });

    describe('updateTemperatureValues', () => {
      it('should update current temperature characteristic when initializing default values', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(temperatureServiceMock.updateCurrentTemperature).toHaveBeenCalledWith(36.6);
      });

      it(`should update current temperature characteristic
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as SmartPlugAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(temperatureServiceMock.updateCurrentTemperature).not.toHaveBeenCalled();
      });
    });
  });
});
