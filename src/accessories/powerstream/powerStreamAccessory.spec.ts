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
import { BrightnessService } from '@ecoflow/accessories/powerstream/services/brightnessService';
import { OutletInvService } from '@ecoflow/accessories/powerstream/services/outletInvService';
import { OutletService } from '@ecoflow/accessories/powerstream/services/outletService';
import { PowerDemandService } from '@ecoflow/accessories/powerstream/services/powerDemandService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import {
  AdditionalBatteryCharacteristicType as CharacteristicType,
  DeviceConfig,
  PowerStreamConsumptionType,
} from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { getActualServices, MockService } from '@ecoflow/helpers/tests/accessoryTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { FanServiceBase } from '@ecoflow/services/fanServiceBase';
import { LightBulbServiceBase } from '@ecoflow/services/lightBulbServiceBase';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

jest.mock('@ecoflow/accessories/powerstream/services/outletService');
jest.mock('@ecoflow/accessories/powerstream/services/outletInvService');
jest.mock('@ecoflow/accessories/powerstream/services/brightnessService');
jest.mock('@ecoflow/accessories/powerstream/services/powerDemandService');
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
  let inverterBrightnessServiceMock: jest.Mocked<BrightnessService>;
  let inverterPowerDemandServiceMock: jest.Mocked<PowerDemandService>;
  let accessoryInformationServiceMock: jest.Mocked<AccessoryInformationService>;
  let batteryStatusProviderMock: jest.Mocked<BatteryStatusProvider>;
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
      Name: 'BrightnessService',
    },
    {
      Name: 'PowerDemandService',
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
      serviceBaseMock.updateBatteryLevel.mockReset();
      serviceBaseMock.updateInputConsumption.mockReset();
      serviceBaseMock.updateOutputConsumption.mockReset();
      serviceBaseMock.updateState.mockReset();
      serviceBaseMock.updateChargingState.mockReset();
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

    function createFanService<TService extends FanServiceBase>(service: TService): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<FanServiceBase>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      serviceBaseMock.updateRotationSpeed.mockReset();
      serviceBaseMock.updateState.mockReset();
      return serviceMock;
    }

    solarOutletServiceMock = createOutletService(new OutletService(accessory, batteryStatusProviderMock, 'PV'));
    batteryOutletServiceMock = createOutletService(new OutletService(accessory, batteryStatusProviderMock, 'BAT'));
    (OutletService as jest.Mock).mockImplementation(
      (_: PowerStreamAccessory, __: BatteryStatusProvider, serviceSubType: string) => {
        if (serviceSubType === 'PV') {
          return solarOutletServiceMock;
        } else if (serviceSubType === 'BAT') {
          return batteryOutletServiceMock;
        }
        return undefined;
      }
    );

    inverterOutletServiceMock = createOutletService(new OutletInvService(accessory, batteryStatusProviderMock));
    (OutletInvService as jest.Mock).mockImplementation(() => inverterOutletServiceMock);

    inverterBrightnessServiceMock = createLightBulbService(new BrightnessService(accessory, 1023));
    (BrightnessService as jest.Mock).mockImplementation(() => inverterBrightnessServiceMock);

    inverterPowerDemandServiceMock = createFanService(new PowerDemandService(accessory, 6000));
    (PowerDemandService as jest.Mock).mockImplementation(() => inverterPowerDemandServiceMock);

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
    batteryStatusProviderMock = {} as jest.Mocked<BatteryStatusProvider>;
    config = { secretKey: 'secretKey1', accessKey: 'accessKey1', serialNumber: 'sn1' } as unknown as DeviceConfig;
    accessory = new PowerStreamAccessory(
      platformMock,
      accessoryMock,
      config,
      logMock,
      httpApiManagerMock,
      mqttApiManagerMock,
      batteryStatusProviderMock
    );
  });

  describe('initialize', () => {
    it('should add required services when initializing accessory', async () => {
      await accessory.initialize();
      const actual = getActualServices(accessory);

      expect(actual).toEqual(expectedServices);
      expect(solarOutletServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(batteryOutletServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(inverterOutletServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(inverterBrightnessServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(inverterPowerDemandServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });

    describe('outletServices', () => {
      function run<TService>(
        expectedServiceSubType: string,
        mock: jest.Mocked<TService>,
        deviceConfig: DeviceConfig
      ): CharacteristicType[] | undefined {
        let actual: CharacteristicType[] | undefined;
        (OutletService as jest.Mock).mockImplementation(
          (
            _: EcoFlowAccessoryBase,
            __: BatteryStatusProvider,
            serviceSubType: string,
            additionalCharacteristics?: CharacteristicType[]
          ) => {
            if (serviceSubType === expectedServiceSubType) {
              actual = additionalCharacteristics;
              return mock;
            }
            return undefined;
          }
        );
        (OutletInvService as jest.Mock).mockImplementation(
          (_: EcoFlowAccessoryBase, __: BatteryStatusProvider, additionalCharacteristics?: CharacteristicType[]) => {
            if (expectedServiceSubType === 'INV') {
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
          mqttApiManagerMock,
          batteryStatusProviderMock
        );
        return actual;
      }

      describe('additionalCharacteristics PV', () => {
        it('should initialize PV outlet service with additional characteristics when they are defined in config', () => {
          const actual = run('PV', solarOutletServiceMock, {
            powerStream: {
              pvAdditionalCharacteristics: [CharacteristicType.OutputConsumptionInWatts],
            },
          } as DeviceConfig);

          expect(actual).toEqual([CharacteristicType.OutputConsumptionInWatts]);
        });

        it('should initialize PV outlet service with additional characteristics when pv settings are not defined in config', () => {
          const actual = run('PV', solarOutletServiceMock, {
            powerStream: {},
          } as DeviceConfig);

          expect(actual).toBeUndefined();
        });

        it(`should initialize PV outlet service with additional characteristics
          when powerStream settings are not defined in config`, () => {
          const actual = run('PV', solarOutletServiceMock, {} as DeviceConfig);

          expect(actual).toBeUndefined();
        });
      });

      describe('additionalCharacteristics BAT', () => {
        it('should initialize BAT outlet service with additional characteristics when they are defined in config', () => {
          const actual = run('BAT', batteryOutletServiceMock, {
            powerStream: {
              batteryAdditionalCharacteristics: [
                CharacteristicType.BatteryLevel,
                CharacteristicType.InputConsumptionInWatts,
                CharacteristicType.OutputConsumptionInWatts,
              ],
            },
          } as DeviceConfig);

          expect(actual).toEqual([
            CharacteristicType.BatteryLevel,
            CharacteristicType.InputConsumptionInWatts,
            CharacteristicType.OutputConsumptionInWatts,
          ]);
        });

        it('should initialize BAT outlet service with additional characteristics when battery settings are not defined in config', () => {
          const actual = run(
            'BAT',
            batteryOutletServiceMock as unknown as jest.Mocked<OutletServiceBase>,
            {
              powerStream: {},
            } as DeviceConfig
          );

          expect(actual).toBeUndefined();
        });

        it(`should initialize BAT outlet service with additional characteristics
          when powerStream settings are not defined in config`, () => {
          const actual = run('BAT', batteryOutletServiceMock, {} as DeviceConfig);

          expect(actual).toBeUndefined();
        });
      });

      describe('additionalCharacteristics INV', () => {
        it('should initialize INV outlet service with additional characteristics when they are defined in config', () => {
          const actual = run('INV', inverterOutletServiceMock, {
            powerStream: {
              inverterAdditionalCharacteristics: [
                CharacteristicType.InputConsumptionInWatts,
                CharacteristicType.OutputConsumptionInWatts,
              ],
            },
          } as DeviceConfig);

          expect(actual).toEqual([
            CharacteristicType.InputConsumptionInWatts,
            CharacteristicType.OutputConsumptionInWatts,
          ]);
        });

        it('should initialize INV outlet service with additional characteristics when inverter settings are not defined in config', () => {
          const actual = run('INV', inverterOutletServiceMock, {
            powerStream: {},
          } as DeviceConfig);

          expect(actual).toBeUndefined();
        });

        it(`should initialize INV outlet service with additional characteristics
          when powerStream settings are not defined in config`, () => {
          const actual = run('INV', inverterOutletServiceMock, {} as DeviceConfig);

          expect(actual).toBeUndefined();
        });
      });
    });

    describe('indicatorService', () => {
      function run(deviceConfig: DeviceConfig): number | undefined {
        let actual: number | undefined;
        (BrightnessService as jest.Mock).mockImplementation((_: EcoFlowAccessoryBase, maxBrightness: number) => {
          actual = maxBrightness;
          return inverterBrightnessServiceMock;
        });

        new PowerStreamAccessory(
          platformMock,
          accessoryMock,
          deviceConfig,
          logMock,
          httpApiManagerMock,
          mqttApiManagerMock,
          batteryStatusProviderMock
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

    describe('powerDemandService', () => {
      function run(deviceConfig: DeviceConfig): number | undefined {
        let actual: number | undefined;
        (PowerDemandService as jest.Mock).mockImplementation((_: EcoFlowAccessoryBase, maxPowerDemand: number) => {
          actual = maxPowerDemand;
          return inverterPowerDemandServiceMock;
        });

        new PowerStreamAccessory(
          platformMock,
          accessoryMock,
          deviceConfig,
          logMock,
          httpApiManagerMock,
          mqttApiManagerMock,
          batteryStatusProviderMock
        );
        return actual;
      }
      describe('maxPowerDemand', () => {
        it('should initialize indicator service with default max power demand when powerStream settings are not defined in config', () => {
          const actual = run({} as DeviceConfig);

          expect(actual).toEqual(6000);
        });

        it(`should initialize indicator service with default max power demand
          when powerStream.type settings are not defined in config`, () => {
          const actual = run({ powerStream: {} } as DeviceConfig);

          expect(actual).toEqual(6000);
        });

        it(`should initialize indicator service with 6000 max power demand
          when powerStream.type is 600W`, () => {
          const actual = run({ powerStream: { type: PowerStreamConsumptionType.W600 } } as DeviceConfig);

          expect(actual).toEqual(6000);
        });

        it(`should initialize indicator service with 8000 max power demand
          when powerStream.type is 800W`, () => {
          const actual = run({ powerStream: { type: PowerStreamConsumptionType.W800 } } as DeviceConfig);

          expect(actual).toEqual(8000);
        });
      });
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

        it('should not update battery level when Hearbeat message is received without batSoc', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              lowerLimit: 15.4,
            },
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(inverterOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        });

        it('should not update battery level when Hearbeat message is received without lowerLimit', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              batSoc: 34.67,
            },
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(inverterOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        });

        it('should update battery level when Hearbeat message is received with batSoc and lowerLimit', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              batSoc: 34.67,
              lowerLimit: 15.4,
            },
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 15.4);
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
              pv1InputWatts: 45,
            },
          };

          processQuotaMessage(message);

          expect(solarOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateState).toHaveBeenCalledWith(true);
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
          expect(solarOutletServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(solarOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update PV Output Consumption when Hearbeat message is received with pv2InputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              pv2InputWatts: 56,
            },
          };

          processQuotaMessage(message);

          expect(solarOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(56 * 0.1);
        });

        it('should update PV Output Consumption when Hearbeat message is received with all pv-related parameters', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              pv1InputWatts: 45,
              pv2InputWatts: 56,
            },
          };

          processQuotaMessage(message);

          expect(solarOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(101 * 0.1);
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

          expect(batteryOutletServiceMock.updateChargingState).not.toHaveBeenCalled();
          expect(batteryOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(batteryOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        });

        it('should update BAT Output Consumption when Hearbeat message is received with positive batInputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              batInputWatts: 124,
            },
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateChargingState).toHaveBeenCalledWith(0);
          expect(batteryOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(batteryOutletServiceMock.updateState).toHaveBeenCalledWith(true);
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

          expect(batteryOutletServiceMock.updateChargingState).toHaveBeenCalledWith(0);
          expect(batteryOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(0);
          expect(batteryOutletServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(batteryOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update BAT Input Consumption when Hearbeat message is received with negative batInputWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              batInputWatts: -456,
            },
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateChargingState).toHaveBeenCalledWith(45.6);
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
              invOutputWatts: 124.1,
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
              invOutputWatts: -456.1,
            },
          };

          processQuotaMessage(message);

          expect(inverterOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(456.1 * 0.1);
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

          expect(inverterBrightnessServiceMock.updateState).toHaveBeenCalledWith(true);
          expect(inverterBrightnessServiceMock.updateBrightness).toHaveBeenCalledWith(23.4);
        });

        it('should update INV power demand when Hearbeat message is received with permanentWatts', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              permanentWatts: 450,
            },
          };

          processQuotaMessage(message);

          expect(inverterPowerDemandServiceMock.updateState).toHaveBeenCalledWith(true);
          expect(inverterPowerDemandServiceMock.updateRotationSpeed).toHaveBeenCalledWith(450);
        });

        it('should update INV power demand when Hearbeat message is received with permanentWatts equal to 0', async () => {
          const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
            cmdFunc: MqttPowerStreamMessageFuncType.Func20,
            cmdId: MqttPowerStreamMessageType.Heartbeat,
            param: {
              permanentWatts: 0,
            },
          };

          processQuotaMessage(message);

          expect(inverterPowerDemandServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(inverterPowerDemandServiceMock.updateRotationSpeed).toHaveBeenCalledWith(0);
        });
      });
    });
  });

  describe('initializeDefaultValues', () => {
    let quota: PowerStreamAllQuotaData;
    beforeEach(() => {
      quota = {
        '20_1': {
          batInputWatts: -120,
          batSoc: 34.1,
          lowerLimit: 56.4,
          invOutputWatts: 50,
          pv1InputWatts: 10,
          pv2InputWatts: 20,
          invOnOff: true,
          permanentWatts: 7000,
          invBrightness: 431,
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

        expect(batteryOutletServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.1, 56.4);
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

        expect(batteryOutletServiceMock.updateChargingState).toHaveBeenCalledWith(12);
        expect(batteryOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(12);
        expect(batteryOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });

      it(`should update BAT consumption-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as PowerStreamAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(batteryOutletServiceMock.updateChargingState).not.toHaveBeenCalled();
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

        expect(inverterBrightnessServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(inverterBrightnessServiceMock.updateBrightness).toHaveBeenCalledWith(431);
      });

      it(`should update INV brightness-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as PowerStreamAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(inverterBrightnessServiceMock.updateState).not.toHaveBeenCalled();
        expect(inverterBrightnessServiceMock.updateBrightness).not.toHaveBeenCalled();
      });
    });

    describe('updatePowerDemand INV', () => {
      it('should update INV brightness-related characteristics when initializing default values', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(inverterPowerDemandServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(inverterPowerDemandServiceMock.updateRotationSpeed).toHaveBeenCalledWith(7000);
      });

      it(`should update INV power demand-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as PowerStreamAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(inverterPowerDemandServiceMock.updateState).not.toHaveBeenCalled();
        expect(inverterPowerDemandServiceMock.updateRotationSpeed).not.toHaveBeenCalled();
      });
    });
  });
});
