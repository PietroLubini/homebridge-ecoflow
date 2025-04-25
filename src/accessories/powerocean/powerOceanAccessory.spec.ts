import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { PowerOceanAllQuotaData } from '@ecoflow/accessories/powerocean/interfaces/powerOceanHttpApiContracts';
import { PowerOceanMqttQuotaMessageWithParams } from '@ecoflow/accessories/powerocean/interfaces/powerOceanMqttApiContracts';
import { PowerOceanAccessory } from '@ecoflow/accessories/powerocean/powerOceanAccessory';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import {
  AdditionalBatteryOutletCharacteristicType as BatteryOutletCharacteristicType,
  AdditionalBatteryCharacteristicType as CharacteristicType,
  DeviceConfig,
  AdditionalOutletCharacteristicType as OutletCharacteristicType,
} from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { getActualServices, MockService } from '@ecoflow/helpers/tests/accessoryTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { OutletBatteryServiceBase } from '@ecoflow/services/outletBatteryServiceBase';
import { OutletReadOnlyService } from '@ecoflow/services/outletReadOnlyService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

jest.mock('@ecoflow/services/outletReadOnlyService');
jest.mock('@ecoflow/services/accessoryInformationService');

describe('PowerOceanAccessory', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;
  let accessory: PowerOceanAccessory;
  let solarOutletServiceMock: jest.Mocked<OutletReadOnlyService>;
  let batteryOutletServiceMock: jest.Mocked<OutletReadOnlyService>;
  let inverterOutletServiceMock: jest.Mocked<OutletReadOnlyService>;
  let accessoryInformationServiceMock: jest.Mocked<AccessoryInformationService>;
  let batteryStatusProviderMock: jest.Mocked<BatteryStatusProvider>;
  const expectedServices: MockService[] = [
    {
      Name: 'OutletReadOnlyService',
    },
    {
      Name: 'OutletReadOnlyService',
    },
    {
      Name: 'OutletReadOnlyService',
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

    function createOutletService<TService extends OutletBatteryServiceBase>(service: TService): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<OutletBatteryServiceBase>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      serviceBaseMock.updateBatteryLevel.mockReset();
      serviceBaseMock.updateInputConsumption.mockReset();
      serviceBaseMock.updateOutputConsumption.mockReset();
      serviceBaseMock.updateState.mockReset();
      serviceBaseMock.updateChargingState.mockReset();
      return serviceMock;
    }

    solarOutletServiceMock = createOutletService(new OutletReadOnlyService(accessory, batteryStatusProviderMock, 'PV'));
    batteryOutletServiceMock = createOutletService(
      new OutletReadOnlyService(accessory, batteryStatusProviderMock, 'BAT')
    );
    inverterOutletServiceMock = createOutletService(
      new OutletReadOnlyService(accessory, batteryStatusProviderMock, 'INV')
    );
    (OutletReadOnlyService as unknown as jest.Mock).mockImplementation(
      (_: PowerOceanAccessory, __: BatteryStatusProvider, serviceSubType: string) => {
        if (serviceSubType === 'PV') {
          return solarOutletServiceMock;
        } else if (serviceSubType === 'BAT') {
          return batteryOutletServiceMock;
        } else if (serviceSubType === 'INV') {
          return inverterOutletServiceMock;
        }
        return undefined;
      }
    );

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
    accessory = new PowerOceanAccessory(
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
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });

    describe('outletServices', () => {
      function run<TService>(
        expectedServiceSubType: string,
        mock: jest.Mocked<TService>,
        deviceConfig: DeviceConfig
      ): CharacteristicType[] | undefined {
        let actual: CharacteristicType[] | undefined;
        (OutletReadOnlyService as unknown as jest.Mock).mockImplementation(
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
        new PowerOceanAccessory(
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
            powerOcean: {
              pvAdditionalCharacteristics: [OutletCharacteristicType.OutputConsumptionInWatts],
            },
          } as DeviceConfig);

          expect(actual).toEqual([OutletCharacteristicType.OutputConsumptionInWatts]);
        });

        it('should initialize PV outlet service with additional characteristics when pv settings are not defined in config', () => {
          const actual = run('PV', solarOutletServiceMock, {
            powerOcean: {},
          } as DeviceConfig);

          expect(actual).toBeUndefined();
        });

        it(`should initialize PV outlet service with additional characteristics
          when powerOcean settings are not defined in config`, () => {
          const actual = run('PV', solarOutletServiceMock, {} as DeviceConfig);

          expect(actual).toBeUndefined();
        });
      });

      describe('additionalCharacteristics BAT', () => {
        it('should initialize BAT outlet service with additional characteristics when they are defined in config', () => {
          const actual = run('BAT', batteryOutletServiceMock, {
            powerOcean: {
              batteryAdditionalCharacteristics: [
                BatteryOutletCharacteristicType.BatteryLevel,
                BatteryOutletCharacteristicType.InputConsumptionInWatts,
                OutletCharacteristicType.OutputConsumptionInWatts,
              ],
            },
          } as DeviceConfig);

          expect(actual).toEqual([
            BatteryOutletCharacteristicType.BatteryLevel,
            BatteryOutletCharacteristicType.InputConsumptionInWatts,
            OutletCharacteristicType.OutputConsumptionInWatts,
          ]);
        });

        it('should initialize BAT outlet service with additional characteristics when battery settings are not defined in config', () => {
          const actual = run(
            'BAT',
            batteryOutletServiceMock as unknown as jest.Mocked<OutletBatteryServiceBase>,
            {
              powerOcean: {},
            } as DeviceConfig
          );

          expect(actual).toBeUndefined();
        });

        it(`should initialize BAT outlet service with additional characteristics
          when powerOcean settings are not defined in config`, () => {
          const actual = run('BAT', batteryOutletServiceMock, {} as DeviceConfig);

          expect(actual).toBeUndefined();
        });
      });

      describe('additionalCharacteristics INV', () => {
        it('should initialize INV outlet service with additional characteristics when they are defined in config', () => {
          const actual = run('INV', inverterOutletServiceMock, {
            powerOcean: {
              inverterAdditionalCharacteristics: [
                BatteryOutletCharacteristicType.InputConsumptionInWatts,
                OutletCharacteristicType.OutputConsumptionInWatts,
              ],
            },
          } as DeviceConfig);

          expect(actual).toEqual([
            BatteryOutletCharacteristicType.InputConsumptionInWatts,
            OutletCharacteristicType.OutputConsumptionInWatts,
          ]);
        });

        it('should initialize INV outlet service with additional characteristics when inverter settings are not defined in config', () => {
          const actual = run('INV', inverterOutletServiceMock, {
            powerOcean: {},
          } as DeviceConfig);

          expect(actual).toBeUndefined();
        });

        it(`should initialize INV outlet service with additional characteristics
          when powerOcean settings are not defined in config`, () => {
          const actual = run('INV', inverterOutletServiceMock, {} as DeviceConfig);

          expect(actual).toBeUndefined();
        });
      });
    });
  });

  describe('processQuotaMessage', () => {
    let quota: PowerOceanAllQuotaData;

    beforeEach(() => {
      quota = {} as PowerOceanAllQuotaData;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
    });

    describe('Hearbeat', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update heartbeat in quota when Hearbeat message is received', async () => {
        const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
          params: {
            bpSoc: 34.67,
          },
        };

        processQuotaMessage(message);
        const actual = quota;

        expect(actual).toEqual(message.params);
      });

      describe('updateBatteryLevel', () => {
        it('should not update battery level when Hearbeat message is received with undefined status', async () => {
          const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
            params: {},
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(inverterOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        });

        it('should update battery level when Hearbeat message is received with bpSoc', async () => {
          const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
            params: {
              bpSoc: 34.67,
            },
          };

          processQuotaMessage(message);

          expect(batteryOutletServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 20);
          expect(inverterOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        });
      });

      describe('updateConsumption PV', () => {
        it('should not update PV Input and Output Consumption when Hearbeat message is received with undefined status', async () => {
          const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
            params: {},
          };

          processQuotaMessage(message);

          expect(solarOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        });

        it('should update PV Output Consumption when Hearbeat message is received with 0 evPwr', async () => {
          const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
            params: {
              evPwr: 0,
            },
          };

          processQuotaMessage(message);

          expect(solarOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update PV Output Consumption when Hearbeat message is received with evPwr', async () => {
          const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
            params: {
              evPwr: 4.5,
            },
          };

          processQuotaMessage(message);

          expect(solarOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(solarOutletServiceMock.updateState).toHaveBeenCalledWith(true);
          expect(solarOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(4.5);
        });

        describe('updateConsumption BAT', () => {
          it('should not update BAT Input and Output Consumption when Hearbeat message is received with undefined status', async () => {
            const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
              params: {},
            };

            processQuotaMessage(message);

            expect(batteryOutletServiceMock.updateChargingState).not.toHaveBeenCalled();
            expect(batteryOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
            expect(batteryOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
          });

          it('should update BAT Output Consumption when Hearbeat message is received with positive bpPwr', async () => {
            const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
              params: {
                bpPwr: 12.4,
              },
            };

            processQuotaMessage(message);

            expect(batteryOutletServiceMock.updateChargingState).toHaveBeenCalledWith(false);
            expect(batteryOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
            expect(batteryOutletServiceMock.updateState).toHaveBeenCalledWith(true);
            expect(batteryOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(12.4);
          });

          it('should update BAT Input and Output Consumption when Hearbeat message is received with zero bpPwr', async () => {
            const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
              params: {
                bpPwr: 0,
              },
            };

            processQuotaMessage(message);

            expect(batteryOutletServiceMock.updateChargingState).toHaveBeenCalledWith(false);
            expect(batteryOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(0);
            expect(batteryOutletServiceMock.updateState).toHaveBeenCalledWith(false);
            expect(batteryOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
          });

          it('should update BAT Input Consumption when Hearbeat message is received with negative bpPwr', async () => {
            const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
              params: {
                bpPwr: -45.6,
              },
            };

            processQuotaMessage(message);

            expect(batteryOutletServiceMock.updateChargingState).toHaveBeenCalledWith(true);
            expect(batteryOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(45.6);
            expect(batteryOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
          });
        });

        describe('updateConsumption INV', () => {
          it('should not update INV Input and Output Consumption when Hearbeat message is received with undefined status', async () => {
            const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
              params: {},
            };

            processQuotaMessage(message);

            expect(inverterOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
            expect(inverterOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
            expect(inverterOutletServiceMock.updateState).not.toHaveBeenCalled();
          });

          it('should update INV Output Consumption when Hearbeat message is received with psysLoadPwr', async () => {
            const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
              params: {
                sysLoadPwr: 12.41,
              },
            };

            processQuotaMessage(message);

            expect(inverterOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(12.41);
          });

          it('should update INV Output Consumption when Hearbeat message is received with zero sysLoadPwr', async () => {
            const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
              params: {
                sysLoadPwr: 0,
              },
            };

            processQuotaMessage(message);

            expect(inverterOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
          });

          it('should update INV Input Consumption when Hearbeat message is received with sysGridPwr', async () => {
            const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
              params: {
                sysGridPwr: 45.61,
              },
            };

            processQuotaMessage(message);

            expect(inverterOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(45.61);
            expect(inverterOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
          });

          it('should update INV Input Consumption when Hearbeat message is received with zero sysGridPwr', async () => {
            const message: PowerOceanMqttQuotaMessageWithParams<PowerOceanAllQuotaData> = {
              params: {
                sysGridPwr: 0,
              },
            };

            processQuotaMessage(message);

            expect(inverterOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(0);
          });
        });
      });
    });
  });

  describe('initializeDefaultValues', () => {
    let quota: PowerOceanAllQuotaData;
    beforeEach(() => {
      quota = {
        bpPwr: -120,
        bpSoc: 34.1,
        sysLoadPwr: 50,
        sysGridPwr: 20,
        evPwr: 10,
      };
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: PowerOceanAllQuotaData = {};

      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    describe('updateBatteryLevel', () => {
      it('should update battery level-related characteristics when initializing default values', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryOutletServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.1, 20);
        expect(solarOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(inverterOutletServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
      });

      it(`should update battery level-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as PowerOceanAllQuotaData);

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

        expect(solarOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(10);
      });

      it(`should update PV consumption-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as PowerOceanAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(solarOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });
    });

    describe('updateConsumption BAT', () => {
      it('should update BAT consumption-related characteristics when initializing default values', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryOutletServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(batteryOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(120);
        expect(batteryOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });

      it(`should update BAT consumption-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as PowerOceanAllQuotaData);

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

        expect(inverterOutletServiceMock.updateInputConsumption).toHaveBeenCalledWith(20);
        expect(inverterOutletServiceMock.updateOutputConsumption).toHaveBeenCalledWith(50);
        expect(inverterOutletServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it(`should update INV consumption-related characteristics
        when initializing default values with quotas were not initialized properly for it`, async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as PowerOceanAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(inverterOutletServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(inverterOutletServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(inverterOutletServiceMock.updateState).not.toHaveBeenCalled();
      });
    });
  });
});
