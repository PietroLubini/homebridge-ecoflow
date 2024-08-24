import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  Heartbeat,
  PowerStreamAllQuotaData,
} from '@ecoflow/accessories/powerstream/interfaces/httpApiPowerStreamContracts';
import {
  MqttPowerStreamMessageFuncType,
  MqttPowerStreamMessageType,
  MqttPowerStreamQuotaMessageWithParams,
} from '@ecoflow/accessories/powerstream/interfaces/mqttApiPowerStreamContracts';
import { PowerStreamAccessory } from '@ecoflow/accessories/powerstream/powerStreamAccessory';
import { LightBulbInvService } from '@ecoflow/accessories/powerstream/services/lightBulbInvService';
import { OutletInvService } from '@ecoflow/accessories/powerstream/services/outletInvService';
import { OutletService } from '@ecoflow/accessories/powerstream/services/outletService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import {
  BatteryDeviceConfig,
  AdditionalBatteryCharacteristicType as CharacteristicType,
  DeviceConfig,
} from '@ecoflow/config';
import { getActualServices, MockService } from '@ecoflow/helpers/tests/accessoryTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { LightBulbServiceBase } from '@ecoflow/services/lightBulbServiceBase';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

jest.mock('@ecoflow/accessories/powerstream/services/outletService');
jest.mock('@ecoflow/accessories/powerstream/services/outletInvService');
jest.mock('@ecoflow/accessories/powerstream/services/lightBulbInvService');
jest.mock('@ecoflow/services/accessoryInformationService');

describe('PowerStreamAccessory', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;
  let accessory: PowerStreamAccessory;
  let solarOutletServiceMock: jest.Mocked<OutletService>;
  let batteryOutletServiceMock: jest.Mocked<OutletService>;
  let inverterOutletServiceMock: jest.Mocked<OutletInvService>;
  let inverterLightBulbServiceMock: jest.Mocked<LightBulbInvService>;
  let accessoryInformationServiceMock: jest.Mocked<AccessoryInformationService>;
  const expectedServices: MockService[] = [
    {
      Name: 'OutletInvService',
    },
    {
      Name: 'OutletService',
    },
    {
      Name: 'OutletService',
    },
    {
      Name: 'LightBulbInvService',
    },
    {
      Name: 'AccessoryInformationService',
    },
  ];

  beforeEach(() => {
    function createService<TService extends ServiceBase>(
      Service: new (ecoFlowAccessory: PowerStreamAccessory) => TService,
      mockResetCallback: ((serviceMock: jest.Mocked<TService>) => void) | null = null
    ): jest.Mocked<TService> {
      const serviceMock = new Service(accessory) as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<ServiceBase>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      if (mockResetCallback) {
        mockResetCallback(serviceMock);
      }
      (Service as jest.Mock).mockImplementation(() => serviceMock);
      return serviceMock;
    }

    function createOutletService<TService extends OutletServiceBase>(
      Service: new (
        ecoFlowAccessory: PowerStreamAccessory,
        serviceSubType: string,
        additionalCharacteristics?: CharacteristicType[]
      ) => TService,
      serviceSubType: string,
      additionalCharacteristics?: CharacteristicType[]
    ): jest.Mocked<TService> {
      const serviceMock = new Service(accessory, serviceSubType, additionalCharacteristics) as jest.Mocked<TService>;
      const mockBase = serviceMock as jest.Mocked<OutletServiceBase>;
      mockBase.initialize.mockReset();
      mockBase.cleanupCharacteristics.mockReset();
      mockBase.updateBatteryLevel.mockReset();
      mockBase.updateInputConsumption.mockReset();
      mockBase.updateOutputConsumption.mockReset();
      mockBase.updateState.mockReset();
      return serviceMock;
    }

    function createLightBulbService<TService extends LightBulbServiceBase>(
      Service: new (ecoFlowAccessory: PowerStreamAccessory, maxBrightness: number, serviceSubType: string) => TService
    ): jest.Mocked<TService> {
      const serviceMock = new Service(accessory, 1023, 'INV') as jest.Mocked<TService>;
      const mockBase = serviceMock as jest.Mocked<LightBulbServiceBase>;
      mockBase.initialize.mockReset();
      mockBase.cleanupCharacteristics.mockReset();
      mockBase.updateBrightness.mockReset();
      mockBase.updateState.mockReset();
      (Service as jest.Mock).mockImplementation(() => serviceMock);
      return serviceMock;
    }

    solarOutletServiceMock = createOutletService(OutletService, 'PV');
    batteryOutletServiceMock = createOutletService(OutletService, 'BAT');
    inverterOutletServiceMock = createOutletService(OutletInvService, 'INV');

    (OutletService as jest.Mock).mockImplementation((_: PowerStreamAccessory, serviceSubType: string) => {
      if (serviceSubType === 'PV') {
        return solarOutletServiceMock;
      } else if (serviceSubType === 'BAT') {
        return batteryOutletServiceMock;
      }
      return undefined;
    });
    (OutletInvService as jest.Mock).mockImplementation(() => inverterOutletServiceMock);

    inverterLightBulbServiceMock = createLightBulbService(LightBulbInvService);
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
      subscribeOnQuotaMessage: jest.fn(),
      subscribeOnSetReplyMessage: jest.fn(),
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowMqttApiManager>;
    config = { secretKey: 'secretKey1', accessKey: 'accessKey1', serialNumber: 'sn1' } as unknown as DeviceConfig;
    accessory = new PowerStreamAccessory(
      platformMock,
      accessoryMock,
      config,
      logMock,
      httpApiManagerMock,
      mqttApiManagerMock
    );
  });

  describe('additionalCharacteristics', () => {
    function run(
      expectedServiceSubType: string,
      mock: jest.Mocked<OutletServiceBase>,
      deviceConfig: DeviceConfig
    ): CharacteristicType[] | undefined {
      let actual: CharacteristicType[] | undefined;
      (OutletService as jest.Mock).mockImplementation(
        (_: EcoFlowAccessoryBase, serviceSubType: string, additionalCharacteristics?: CharacteristicType[]) => {
          if (serviceSubType === expectedServiceSubType) {
            actual = additionalCharacteristics;
            return mock;
          }
          return undefined;
        }
      );
      (OutletInvService as jest.Mock).mockImplementation(
        (_: EcoFlowAccessoryBase, serviceSubType: string, additionalCharacteristics?: CharacteristicType[]) => {
          if (serviceSubType === expectedServiceSubType) {
            actual = additionalCharacteristics;
            return mock;
          }
          return undefined;
        }
      );
      new PowerStreamAccessory(
        platformMock,
        accessoryMock,
        deviceConfig,
        logMock,
        httpApiManagerMock,
        mqttApiManagerMock
      );
      return actual;
    }

    describe('PV', () => {
      it('should initialize PV outlet service with additional characteristics when they are defined in config', () => {
        const actual = run('PV', solarOutletServiceMock, {
          powerStream: {
            solar: {
              additionalCharacteristics: [CharacteristicType.OutputConsumptionInWatts],
            },
          },
        } as DeviceConfig);

        expect(actual).toEqual([CharacteristicType.OutputConsumptionInWatts]);
      });

      it('should initialize PV outlet service with additional characteristics when solar settings are not defined in config', () => {
        const actual = run('PV', solarOutletServiceMock, {
          powerStream: {
            solar: {} as BatteryDeviceConfig,
          },
        } as DeviceConfig);

        expect(actual).toBeUndefined();
      });

      it('should initialize PV outlet service with additional characteristics when powerStream settings are not defined in config', () => {
        const actual = run('PV', solarOutletServiceMock, {} as DeviceConfig);

        expect(actual).toBeUndefined();
      });
    });

    describe('BAT', () => {
      it('should initialize BAT outlet service with additional characteristics when they are defined in config', () => {
        const actual = run('BAT', batteryOutletServiceMock, {
          powerStream: {
            battery: {
              additionalCharacteristics: [
                CharacteristicType.BatteryLevel,
                CharacteristicType.InputConsumptionInWatts,
                CharacteristicType.OutputConsumptionInWatts,
              ],
            },
          },
        } as DeviceConfig);

        expect(actual).toEqual([
          CharacteristicType.BatteryLevel,
          CharacteristicType.InputConsumptionInWatts,
          CharacteristicType.OutputConsumptionInWatts,
        ]);
      });

      it('should initialize BAT outlet service with additional characteristics when battery settings are not defined in config', () => {
        const actual = run('BAT', batteryOutletServiceMock, {
          powerStream: {
            battery: {} as BatteryDeviceConfig,
          },
        } as DeviceConfig);

        expect(actual).toBeUndefined();
      });

      it('should initialize BAT outlet service with additional characteristics when powerStream settings are not defined in config', () => {
        const actual = run('BAT', batteryOutletServiceMock, {} as DeviceConfig);

        expect(actual).toBeUndefined();
      });
    });

    describe('INV', () => {
      it('should initialize INV outlet service with additional characteristics when they are defined in config', () => {
        const actual = run('INV', inverterOutletServiceMock, {
          powerStream: {
            inverter: {
              additionalCharacteristics: [
                CharacteristicType.InputConsumptionInWatts,
                CharacteristicType.OutputConsumptionInWatts,
              ],
            },
          },
        } as DeviceConfig);

        expect(actual).toEqual([
          CharacteristicType.InputConsumptionInWatts,
          CharacteristicType.OutputConsumptionInWatts,
        ]);
      });

      it('should initialize INV outlet service with additional characteristics when inverter settings are not defined in config', () => {
        const actual = run('INV', inverterOutletServiceMock, {
          powerStream: {
            inverter: {} as BatteryDeviceConfig,
          },
        } as DeviceConfig);

        expect(actual).toBeUndefined();
      });

      it('should initialize INV outlet service with additional characteristics when powerStream settings are not defined in config', () => {
        const actual = run('INV', inverterOutletServiceMock, {} as DeviceConfig);

        expect(actual).toBeUndefined();
      });
    });
  });

  describe('initialize', () => {
    it('should add required services when initializing accessory', async () => {
      await accessory.initialize();
      const actual = getActualServices(accessory);

      expect(actual).toEqual(expectedServices);
      expect(solarOutletServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(batteryOutletServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(inverterOutletServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(inverterLightBulbServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('processQuotaMessage', () => {
    let quota: PowerStreamAllQuotaData;

    beforeEach(() => {
      quota = {} as PowerStreamAllQuotaData;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
    });

    describe('Hearbeat', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota['20_1'] = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update heartbeat in quota when Hearbeat message is received', async () => {
        const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
          cmdFunc: MqttPowerStreamMessageFuncType.Func20,
          cmdId: MqttPowerStreamMessageType.Heartbeat,
          param: {
            batSoc: 34.67,
          },
        };

        processQuotaMessage(message);
        const actual = quota['20_1'];

        expect(actual).toEqual(message.param);
      });

      describe('updateBatteryLevel', () => {
        it('should not update battery level when Hearbeat message is received with undefined status', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {},
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(inverterOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        });

        it('should update battery level when Hearbeat message is received with batSoc', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              batSoc: 34.67,
            },
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67);
          expect(inverterOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        });
      });

      describe('updateConsumption PV', () => {
        it('should not update PV Input and Output Consumption when Hearbeat message is received with undefined status', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {},
          };

          processQuotaMessage(message);

          expect(solarOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        });

        it('should update PV Output Consumption when Hearbeat message is received with 0 pv1InputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              pv1InputWatts: 0,
            },
          };

          processQuotaMessage(message);

          expect(solarOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update PV Output Consumption when Hearbeat message is received with pv1InputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              pv1InputWatts: 4.5,
            },
          };

          processQuotaMessage(message);

          expect(solarOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(4.5);
        });

        it('should update PV Output Consumption when Hearbeat message is received with 0 pv2InputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              pv2InputWatts: 0,
            },
          };

          processQuotaMessage(message);

          expect(solarOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update PV Output Consumption when Hearbeat message is received with pv2InputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              pv2InputWatts: 5.6,
            },
          };

          processQuotaMessage(message);

          expect(solarOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(5.6);
        });

        it('should update PV Output Consumption when Hearbeat message is received with all pv-related parameters', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              pv1InputWatts: 4.5,
              pv2InputWatts: 5.6,
            },
          };

          processQuotaMessage(message);

          expect(solarOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(10.1);
        });
      });

      describe('updateConsumption BAT', () => {
        it('should not update BAT Input and Output Consumption when Hearbeat message is received with undefined status', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {},
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(batteryOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        });

        it('should update BAT Output Consumption when Hearbeat message is received with positive batInputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              batInputWatts: 12.4,
            },
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(batteryOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(12.4);
        });

        it('should update BAT Input and Output Consumption when Hearbeat message is received with zero batInputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              batInputWatts: 0,
            },
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(0);
          expect(batteryOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update BAT Input Consumption when Hearbeat message is received with negative batInputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              batInputWatts: -45.6,
            },
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(45.6);
          expect(batteryOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        });
      });

      describe('updateConsumption INV', () => {
        it('should not update INV Input and Output Consumption when Hearbeat message is received with undefined status', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {},
          };

          processQuotaMessage(message);

          expect(inverterOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(inverterOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
          expect(inverterOutletServiceMock.updateState).not.toHaveBeenCalled();
        });

        it('should update INV Output Consumption when Hearbeat message is received with positive invOutputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              invOutputWatts: 12.41,
            },
          };

          processQuotaMessage(message);

          expect(inverterOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(inverterOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(12.41);
        });

        it('should update INV Input and Output Consumption when Hearbeat message is received with zero invOutputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              invOutputWatts: 0,
            },
          };

          processQuotaMessage(message);

          expect(inverterOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(0);
          expect(inverterOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update INV Input Consumption when Hearbeat message is received with negative invOutputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              invOutputWatts: -45.61,
            },
          };

          processQuotaMessage(message);

          expect(inverterOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(45.61);
          expect(inverterOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        });

        it('should update INV State when Hearbeat message is received with invOnOff set to true', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              invOnOff: true,
            },
          };

          processQuotaMessage(message);

          expect(inverterOutletServiceMock.updateState).toHaveBeenCalledWith(true);
        });

        it('should update INV brightness when Hearbeat message is received with invBrightness', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              invBrightness: 23.4,
            },
          };

          processQuotaMessage(message);

          expect(inverterLightBulbServiceMock.updateState).toHaveBeenCalledWith(true);
          expect(inverterLightBulbServiceMock.updateBrightness).toHaveBeenCalledWith(23.4);
        });
      });
    });
  });

  describe('initializeDefaultValues', () => {
    let quota: PowerStreamAllQuotaData;
    beforeEach(() => {
      quota = {
        '20_1': {
          batInputWatts: -12,
          batSoc: 34.1,
          invOutputWatts: 5,
          pv1InputWatts: 1,
          pv2InputWatts: 2,
          invOnOff: true,
        },
      };
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: PowerStreamAllQuotaData = { '20_1': {} };

      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    describe('updateBatteryLevel', () => {
      it('should update battery level-related characteristics when initializing default values', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryOutletServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.1);
        expect(solarOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(inverterOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
      });

      it(`should update battery level-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as PowerStreamAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(batteryOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(solarOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(inverterOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
      });
    });

    describe('updateConsumption PV', () => {
      it('should update PV consumption-related characteristics when initializing default values', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(solarOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(3);
      });

      it(`should update PV consumption-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as PowerStreamAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(solarOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });
    });

    describe('updateConsumption BAT', () => {
      it('should update BAT consumption-related characteristics when initializing default values', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(12);
        expect(batteryOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });

      it(`should update BAT consumption-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as PowerStreamAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(batteryOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(batteryOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });
    });

    describe('updateConsumption INV', () => {
      it('should update INV consumption-related characteristics when initializing default values', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(inverterOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(inverterOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(5);
        expect(inverterOutletServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it(`should update INV consumption-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as PowerStreamAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(inverterOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(inverterOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(inverterOutletServiceMock.updateState).not.toHaveBeenCalled();
      });
    });

    describe('updateBrightness INV', () => {
      it('should update INV brightness-related characteristics when initializing default values', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(inverterLightBulbServiceMock.updateState).not.toHaveBeenCalled();
        expect(inverterLightBulbServiceMock.updateBrightness).not.toHaveBeenCalled();
      });

      it(`should update INV brightness-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as PowerStreamAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(inverterLightBulbServiceMock.updateState).not.toHaveBeenCalled();
        expect(inverterLightBulbServiceMock.updateBrightness).not.toHaveBeenCalled();
      });
    });
  });
});
