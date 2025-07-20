import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { DeviceConfig } from '@ecoflow/config';
import { getActualServices, MockService } from '@ecoflow/helpers/tests/accessoryTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

import {
  BmsStatus,
  PdStatus,
  PdStatusDev,
  PowerStatus,
  WaveAllQuotaData,
  WaveDrainageWaterLevelType,
  WaveFanSpeedType,
  WaveMainModeType,
  WavePowerModeType,
  WaveTemperatureDisplayType,
} from '@ecoflow/accessories/wave/interfaces/waveHttpApiContracts';
import {
  WaveAnalysisPdQuotaParams,
  WaveMqttMessageTypeCodeType,
  WaveMqttQuotaMessageWithParams,
} from '@ecoflow/accessories/wave/interfaces/waveMqttApiContracts';
import { FanModeService } from '@ecoflow/accessories/wave/services/fanModeService';
import { ThermostatAirConditionerService } from '@ecoflow/accessories/wave/services/thermostatAirConditionerService';
import { WaveAccessory } from '@ecoflow/accessories/wave/waveAccessory';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { TargetHeatingCoolingStateType, TemperatureDisplayUnitsType } from '@ecoflow/characteristics/characteristicContracts';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { OutletBatteryServiceBase } from '@ecoflow/services/outletBatteryServiceBase';
import { OutletReadOnlyService } from '@ecoflow/services/outletReadOnlyService';

jest.mock('@ecoflow/services/outletReadOnlyService');
jest.mock('@ecoflow/services/accessoryInformationService');
jest.mock('@ecoflow/services/batteryStatusService');
jest.mock('@ecoflow/accessories/wave/services/thermostatAirConditionerService');
jest.mock('@ecoflow/accessories/wave/services/fanModeService');

describe('WaveAccessory', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;
  let accessory: WaveAccessory;
  let batteryStatusProviderMock: jest.Mocked<BatteryStatusProvider>;
  let batteryStatusServiceMock: jest.Mocked<BatteryStatusService>;
  let outletBatteryServiceMock: jest.Mocked<OutletReadOnlyService>;
  let thermostatAirConditionerServiceMock: jest.Mocked<ThermostatAirConditionerService>;
  let fanModeServiceMock: jest.Mocked<FanModeService>;
  let accessoryInformationServiceMock: jest.Mocked<AccessoryInformationService>;
  const expectedServices: MockService[] = [
    {
      Name: 'BatteryStatusService',
    },
    {
      Name: 'OutletReadOnlyService',
    },
    {
      Name: 'ThermostatAirConditionerService',
    },
    {
      Name: 'FanModeService',
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

    function createBatteryStatusService<TService extends BatteryStatusService>(service: TService): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<BatteryStatusService>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      serviceBaseMock.updateBatteryLevel.mockReset();
      serviceBaseMock.updateChargingState.mockReset();
      return serviceMock;
    }

    function createOutletBatteryService<TService extends OutletBatteryServiceBase>(service: TService): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<OutletBatteryServiceBase>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      serviceBaseMock.updateBatteryLevel.mockReset();
      serviceBaseMock.updateChargingState.mockReset();
      serviceBaseMock.updateEnabled.mockReset();
      serviceBaseMock.updateInputConsumption.mockReset();
      serviceBaseMock.updateOutputConsumption.mockReset();
      serviceBaseMock.updateOutputCurrent.mockReset();
      serviceBaseMock.updateOutputVoltage.mockReset();
      serviceBaseMock.updateState.mockReset();
      return serviceMock;
    }

    function createThermostatAirConditionerService<TService extends ThermostatAirConditionerService>(service: TService): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<ThermostatAirConditionerService>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      serviceBaseMock.updateCurrentState.mockReset();
      serviceBaseMock.updateCurrentTemperature.mockReset();
      serviceBaseMock.updateEnabled.mockReset();
      serviceBaseMock.updateTargetState.mockReset();
      serviceBaseMock.updateTargetTemperature.mockReset();
      serviceBaseMock.updateTemperatureDisplayUnits.mockReset();
      return serviceMock;
    }

    function createFanModeService<TService extends FanModeService>(service: TService): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<FanModeService>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      serviceBaseMock.updateEnabled.mockReset();
      serviceBaseMock.updatePositionedRotationSpeed.mockReset();
      serviceBaseMock.updateReachability.mockReset();
      serviceBaseMock.updateRotationSpeed.mockReset();
      serviceBaseMock.updateState.mockReset();
      return serviceMock;
    }

    batteryStatusProviderMock = {} as jest.Mocked<BatteryStatusProvider>;
    batteryStatusServiceMock = createBatteryStatusService(new BatteryStatusService(accessory, batteryStatusProviderMock));
    (BatteryStatusService as unknown as jest.Mock).mockImplementation(() => batteryStatusServiceMock);

    thermostatAirConditionerServiceMock = createThermostatAirConditionerService(new ThermostatAirConditionerService(accessory));
    (ThermostatAirConditionerService as unknown as jest.Mock).mockImplementation(() => thermostatAirConditionerServiceMock);

    fanModeServiceMock = createFanModeService(new FanModeService(accessory));
    (FanModeService as unknown as jest.Mock).mockImplementation(() => fanModeServiceMock);

    outletBatteryServiceMock = createOutletBatteryService(
      new OutletReadOnlyService(accessory, batteryStatusProviderMock, 'Battery', config?.battery?.additionalCharacteristics)
    );
    (OutletReadOnlyService as unknown as jest.Mock).mockImplementation(() => outletBatteryServiceMock);

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
      subscribeOnStatusTopic: jest.fn(),
      subscribeOnQuotaMessage: jest.fn(),
      subscribeOnSetReplyMessage: jest.fn(),
      subscribeOnStatusMessage: jest.fn(),
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowMqttApiManager>;
    config = { secretKey: 'secretKey1', accessKey: 'accessKey1', serialNumber: 'sn1' } as unknown as DeviceConfig;
    accessory = new WaveAccessory(platformMock, accessoryMock, config, logMock, httpApiManagerMock, mqttApiManagerMock, batteryStatusProviderMock);
  });

  describe('initialize', () => {
    it('should add required services when initializing accessory', async () => {
      await accessory.initialize();
      const actual = getActualServices(accessory);

      expect(actual).toEqual(expectedServices);
      expect(batteryStatusServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(thermostatAirConditionerServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(outletBatteryServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('processQuotaMessage', () => {
    let quota: WaveAllQuotaData;

    beforeEach(() => {
      quota = {} as WaveAllQuotaData;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);
    });

    describe('updateBmsValues', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.bms = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update bms in quota when Bms message is received', async () => {
        const message: WaveMqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.BMS,
          params: {
            bmsSoc: 34.67,
            bmsMinDsgSoc: 32.1,
          },
        };

        processQuotaMessage(message);
        const actual = quota.bms;

        expect(actual).toEqual(message.params);
      });

      it('should update battery level when Bms message is received with bmsSoc', async () => {
        const message: WaveMqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.BMS,
          params: {
            bmsSoc: 34.67,
            bmsMinDsgSoc: 32.1,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 32.1);
        expect(outletBatteryServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 32.1);
      });

      it('should not update any characteristic when Bms message is received with undefined status', async () => {
        const message: WaveMqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.BMS,
          params: {},
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
      });
    });

    describe('updatePowerValues', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.power = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update power in quota when Power message is received', async () => {
        const message: WaveMqttQuotaMessageWithParams<PowerStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.POWER,
          params: {
            batPwrOut: 12.34,
          },
        };

        processQuotaMessage(message);
        const actual = quota.power;

        expect(actual).toEqual(message.params);
      });

      it(`should update charging state to true
              when Power message is received with non zero acPwrIn and without batPwrOut`, async () => {
        const message: WaveMqttQuotaMessageWithParams<PowerStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.POWER,
          params: {
            acPwrIn: 12.34,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletBatteryServiceMock.updateChargingState).toHaveBeenCalledWith(true);
      });

      it(`should update charging state to true
              when Power message is received with non zero acPwrIn and non equal to it batPwrOut`, async () => {
        const message: WaveMqttQuotaMessageWithParams<PowerStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.POWER,
          params: {
            acPwrIn: 12.34,
            batPwrOut: 30.45,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletBatteryServiceMock.updateChargingState).toHaveBeenCalledWith(true);
      });

      it(`should update charging state to false
              when Power message is received with zero acPwrIn and non equal to it batPwrOut`, async () => {
        const message: WaveMqttQuotaMessageWithParams<PowerStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.POWER,
          params: {
            acPwrIn: 0,
            batPwrOut: 30.45,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletBatteryServiceMock.updateChargingState).toHaveBeenCalledWith(false);
      });

      it(`should update charging state to false
              when Power message is received with zero acPwrIn and batPwrOut`, async () => {
        const message: WaveMqttQuotaMessageWithParams<PowerStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.POWER,
          params: {
            acPwrIn: 0,
            batPwrOut: 0,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletBatteryServiceMock.updateChargingState).toHaveBeenCalledWith(false);
      });

      it('should update battery outlet input consumptions when Power message is received with acPwrIn', async () => {
        const message: WaveMqttQuotaMessageWithParams<PowerStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.POWER,
          params: {
            acPwrIn: 12.34,
          },
        };

        processQuotaMessage(message);

        expect(outletBatteryServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
      });

      it('should update battery outlet output watts consumption when Power message is received with batPwrOut', async () => {
        const message: WaveMqttQuotaMessageWithParams<PowerStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.POWER,
          params: {
            batPwrOut: 45.67,
          },
        };

        processQuotaMessage(message);

        expect(outletBatteryServiceMock.updateOutputConsumption).toHaveBeenCalledWith(45.67);
      });

      it('should update battery outlet output current when Power message is received with batCurr', async () => {
        const message: WaveMqttQuotaMessageWithParams<PowerStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.POWER,
          params: {
            batCurr: 1234,
          },
        };

        processQuotaMessage(message);

        expect(outletBatteryServiceMock.updateOutputCurrent).toHaveBeenCalledWith(1.234);
      });

      it('should update battery outlet output voltage when Power message is received with batVolt', async () => {
        const message: WaveMqttQuotaMessageWithParams<PowerStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.POWER,
          params: {
            batVolt: 123,
          },
        };

        processQuotaMessage(message);

        expect(outletBatteryServiceMock.updateOutputVoltage).toHaveBeenCalledWith(1.23);
      });

      it('should not update any characteristic when Power message is received with undefined status', async () => {
        const message: WaveMqttQuotaMessageWithParams<PowerStatus> = {
          typeCode: WaveMqttMessageTypeCodeType.POWER,
          params: {},
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateOutputCurrent).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateOutputVoltage).not.toHaveBeenCalled();
      });
    });

    describe('updatePdValues', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.pd = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update pd status in quota when PdStatus message is received', async () => {
        const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
          typeCode: WaveMqttMessageTypeCodeType.PD,
          params: {
            pdMainMode: WaveMainModeType.Heat,
            pdTempSys: undefined,
            setFanVal: WaveFanSpeedType.Medium,
            lcdStatus: WaveTemperatureDisplayType.AirOutlet,
            waterValue: WaveDrainageWaterLevelType.Full,
            powerSts: WavePowerModeType.On,
            setTempCel: 24,
            setTempfah: 98.6,
          },
        };
        const expected: PdStatus = {
          mainMode: WaveMainModeType.Heat,
          tempSys: undefined,
          fanValue: WaveFanSpeedType.Medium,
          tempDisplay: WaveTemperatureDisplayType.AirOutlet,
          waterValue: WaveDrainageWaterLevelType.Full,
          powerMode: WavePowerModeType.On,
          setTemp: undefined,
        };

        processQuotaMessage(message);
        const actual = quota.pd;

        expect(actual).toEqual(expected);
      });

      it('should update setTemp in pd status in quota when PdStatus message is received with Celsius value', async () => {
        const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
          typeCode: WaveMqttMessageTypeCodeType.PD,
          params: {
            pdTempSys: TemperatureDisplayUnitsType.Celsius,
            setTempCel: 24,
            setTempfah: 98.6,
          },
        };
        const expected: PdStatus = {
          mainMode: undefined,
          tempSys: TemperatureDisplayUnitsType.Celsius,
          fanValue: undefined,
          tempDisplay: undefined,
          waterValue: undefined,
          powerMode: undefined,
          setTemp: 24,
        };

        processQuotaMessage(message);
        const actual = quota.pd;

        expect(actual).toEqual(expected);
      });

      it('should update setTemp in pd status in quota when PdStatus message is received with Fahrenheit value', async () => {
        const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
          typeCode: WaveMqttMessageTypeCodeType.PD,
          params: {
            pdTempSys: TemperatureDisplayUnitsType.Fahrenheit,
            setTempCel: 24,
            setTempfah: 98.6,
          },
        };
        const expected: PdStatus = {
          mainMode: undefined,
          tempSys: TemperatureDisplayUnitsType.Fahrenheit,
          fanValue: undefined,
          tempDisplay: undefined,
          waterValue: undefined,
          powerMode: undefined,
          setTemp: 37,
        };

        processQuotaMessage(message);
        const actual = quota.pd;

        expect(actual).toEqual(expected);
      });

      it('should not update any characteristic when PdStatus message is received with undefined status', async () => {
        const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
          typeCode: WaveMqttMessageTypeCodeType.PD,
          params: {},
        };

        processQuotaMessage(message);

        expect(thermostatAirConditionerServiceMock.updateTargetState).not.toHaveBeenCalled();
        expect(thermostatAirConditionerServiceMock.updateTargetTemperature).not.toHaveBeenCalled();
        expect(thermostatAirConditionerServiceMock.updateTemperatureDisplayUnits).not.toHaveBeenCalled();
        expect(fanModeServiceMock.updateState).not.toHaveBeenCalled();
        expect(fanModeServiceMock.updatePositionedRotationSpeed).not.toHaveBeenCalled();
      });

      describe('updateAirConditionerModeValues', () => {
        it('Should update target state to Off when PdStatus message is received with powerSts=Off', async () => {
          const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
            typeCode: WaveMqttMessageTypeCodeType.PD,
            params: {
              pdMainMode: WaveMainModeType.Fan,
              powerSts: WavePowerModeType.Off,
            },
          };

          processQuotaMessage(message);

          expect(thermostatAirConditionerServiceMock.updateTargetState).toHaveBeenCalledWith(TargetHeatingCoolingStateType.Off);
          expect(fanModeServiceMock.updateState).toHaveBeenCalledWith(false);
        });

        it('Should update target state to Auto when PdStatus message is received with powerSts=On and pdMainMode=Fan', async () => {
          const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
            typeCode: WaveMqttMessageTypeCodeType.PD,
            params: {
              pdMainMode: WaveMainModeType.Fan,
              powerSts: WavePowerModeType.On,
            },
          };

          processQuotaMessage(message);

          expect(thermostatAirConditionerServiceMock.updateTargetState).toHaveBeenCalledWith(TargetHeatingCoolingStateType.Auto);
          expect(fanModeServiceMock.updateState).toHaveBeenCalledWith(true);
        });

        it('Should update target state to Cool when PdStatus message is received with powerSts=On and pdMainMode=Cool', async () => {
          const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
            typeCode: WaveMqttMessageTypeCodeType.PD,
            params: {
              pdMainMode: WaveMainModeType.Cool,
              powerSts: WavePowerModeType.On,
            },
          };

          processQuotaMessage(message);

          expect(thermostatAirConditionerServiceMock.updateTargetState).toHaveBeenCalledWith(TargetHeatingCoolingStateType.Cool);
          expect(fanModeServiceMock.updateState).toHaveBeenCalledWith(false);
        });

        it('Should update target state to Cool when PdStatus message is received with powerSts=On and pdMainMode=Heat', async () => {
          const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
            typeCode: WaveMqttMessageTypeCodeType.PD,
            params: {
              pdMainMode: WaveMainModeType.Heat,
              powerSts: WavePowerModeType.On,
            },
          };

          processQuotaMessage(message);

          expect(thermostatAirConditionerServiceMock.updateTargetState).toHaveBeenCalledWith(TargetHeatingCoolingStateType.Heat);
          expect(fanModeServiceMock.updateState).toHaveBeenCalledWith(false);
        });

        it('Should not update target state when PdStatus message is received without powerSts', async () => {
          const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
            typeCode: WaveMqttMessageTypeCodeType.PD,
            params: {
              pdMainMode: WaveMainModeType.Heat,
            },
          };

          processQuotaMessage(message);

          expect(thermostatAirConditionerServiceMock.updateTargetState).not.toHaveBeenCalled();
          expect(fanModeServiceMock.updateState).not.toHaveBeenCalled();
        });

        it('Should not update target state when PdStatus message is received without pdMainMode', async () => {
          const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
            typeCode: WaveMqttMessageTypeCodeType.PD,
            params: {
              powerSts: WavePowerModeType.On,
            },
          };

          processQuotaMessage(message);

          expect(thermostatAirConditionerServiceMock.updateTargetState).not.toHaveBeenCalled();
          expect(fanModeServiceMock.updateState).not.toHaveBeenCalled();
        });
      });

      describe('updateFanModeValues', () => {
        it('Should update fan rotation speed when PdStatus message is received with setFanVal=Medium', async () => {
          const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
            typeCode: WaveMqttMessageTypeCodeType.PD,
            params: {
              setFanVal: WaveFanSpeedType.Medium,
            },
          };

          processQuotaMessage(message);

          expect(fanModeServiceMock.updatePositionedRotationSpeed).toHaveBeenCalledWith(WaveFanSpeedType.Medium);
        });

        it('Should not update fan rotation speed when PdStatus message is received without setFanVal', async () => {
          const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
            typeCode: WaveMqttMessageTypeCodeType.PD,
            params: {},
          };

          processQuotaMessage(message);

          expect(fanModeServiceMock.updatePositionedRotationSpeed).not.toHaveBeenCalled();
        });
      });

      describe('updateAirConditionerStateValues', () => {
        it('Should update temperature display units when PdStatus message is received with pdTempSys=Fahrenheit', async () => {
          const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
            typeCode: WaveMqttMessageTypeCodeType.PD,
            params: {
              pdTempSys: TemperatureDisplayUnitsType.Fahrenheit,
            },
          };

          processQuotaMessage(message);

          expect(thermostatAirConditionerServiceMock.updateTemperatureDisplayUnits).toHaveBeenCalledWith(TemperatureDisplayUnitsType.Fahrenheit);
        });

        it('Should update target temperature when PdStatus message is received with pdTempSys=Celsius and setTempCel', async () => {
          const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
            typeCode: WaveMqttMessageTypeCodeType.PD,
            params: {
              pdTempSys: TemperatureDisplayUnitsType.Celsius,
              setTempCel: 21,
            },
          };

          processQuotaMessage(message);

          expect(thermostatAirConditionerServiceMock.updateTargetTemperature).toHaveBeenCalledWith(21);
        });

        it('Should not update temperature parameters when PdStatus message is received without pdTempSys, setTempCel and setTempfah ', async () => {
          const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
            typeCode: WaveMqttMessageTypeCodeType.PD,
            params: {},
          };

          processQuotaMessage(message);

          expect(thermostatAirConditionerServiceMock.updateTemperatureDisplayUnits).not.toHaveBeenCalled();
          expect(thermostatAirConditionerServiceMock.updateTargetTemperature).not.toHaveBeenCalled();
        });
      });
    });

    describe('updatePdDevValues', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.power = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update pd status in quota when PdStatusDev message is received', async () => {
        const message: WaveMqttQuotaMessageWithParams<PdStatusDev> = {
          typeCode: WaveMqttMessageTypeCodeType.PD_DEV,
          params: {
            coolTemp: 21,
            envTemp: 32,
          },
        };

        const expected: PdStatus = {
          coolTemp: 21,
          envTemp: 32,
        };

        processQuotaMessage(message);
        const actual = quota.pd;

        expect(actual).toEqual(expected);
      });

      it('Should update current temperature when PdStatusDev message is received with envTemp', async () => {
        const message: WaveMqttQuotaMessageWithParams<PdStatusDev> = {
          typeCode: WaveMqttMessageTypeCodeType.PD_DEV,
          params: {
            envTemp: 32,
          },
        };

        processQuotaMessage(message);

        expect(thermostatAirConditionerServiceMock.updateCurrentTemperature).toHaveBeenCalledWith(32);
      });

      it('Should not update current temperature when PdStatusDev message is received without envTemp', async () => {
        const message: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
          typeCode: WaveMqttMessageTypeCodeType.PD,
          params: {},
        };

        processQuotaMessage(message);

        expect(thermostatAirConditionerServiceMock.updateCurrentState).not.toHaveBeenCalled();
      });
    });
  });

  describe('initializeQuota', () => {
    let quota: WaveAllQuotaData;
    beforeEach(() => {
      quota = {
        bms: {
          bmsSoc: 1.1,
          bmsMinDsgSoc: 1.2,
        },
        power: {
          batCurr: 2100,
          acPwrIn: 2.2,
          batPwrOut: 2.3,
          batVolt: 240,
        },
        pd: {
          mainMode: WaveMainModeType.Heat,
          tempSys: TemperatureDisplayUnitsType.Fahrenheit,
          fanValue: WaveFanSpeedType.Medium,
          tempDisplay: WaveTemperatureDisplayType.AirOutlet,
          waterValue: WaveDrainageWaterLevelType.Full,
          powerMode: WavePowerModeType.On,
          setTemp: 98.6,
          envTemp: 33,
        },
      };
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: WaveAllQuotaData = { bms: {}, power: {}, pd: {} };

      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    describe('updateBmsInitialValues', () => {
      it('should update BMS-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 1.2);
        expect(outletBatteryServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 1.2);
      });

      it('should not update BMS-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as WaveAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
      });
    });

    describe('updatePdInitialValues', () => {
      describe('pdMessage', () => {
        it('should update Pd-related characteristics when is requested', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

          await accessory.initializeDefaultValues();

          expect(thermostatAirConditionerServiceMock.updateTargetState).toHaveBeenCalledWith(TargetHeatingCoolingStateType.Heat);
          expect(thermostatAirConditionerServiceMock.updateTemperatureDisplayUnits).toHaveBeenCalledWith(TemperatureDisplayUnitsType.Fahrenheit);
          expect(fanModeServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(fanModeServiceMock.updatePositionedRotationSpeed).toHaveBeenCalledWith(WaveFanSpeedType.Medium);
        });

        it('should update target temperature when quota is received with tempSys=Fahrenheit', async () => {
          quota.pd.tempSys = TemperatureDisplayUnitsType.Fahrenheit;
          quota.pd.setTemp = 98.6;
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

          await accessory.initializeDefaultValues();

          expect(thermostatAirConditionerServiceMock.updateTargetTemperature).toHaveBeenCalledWith(37);
        });

        it('should update target temperature when quota is received with tempSys=Celsius', async () => {
          quota.pd.tempSys = TemperatureDisplayUnitsType.Celsius;
          quota.pd.setTemp = 27;
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

          await accessory.initializeDefaultValues();

          expect(thermostatAirConditionerServiceMock.updateTargetTemperature).toHaveBeenCalledWith(27);
        });

        it('should not update Pd-related characteristics when is requested and quotas were not initialized properly for it', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as WaveAllQuotaData);

          await accessory.initializeDefaultValues();

          expect(thermostatAirConditionerServiceMock.updateTargetState).not.toHaveBeenCalled();
          expect(thermostatAirConditionerServiceMock.updateTargetTemperature).not.toHaveBeenCalled();
          expect(thermostatAirConditionerServiceMock.updateTemperatureDisplayUnits).not.toHaveBeenCalled();
          expect(fanModeServiceMock.updateState).not.toHaveBeenCalled();
          expect(fanModeServiceMock.updatePositionedRotationSpeed).not.toHaveBeenCalled();
        });
      });

      describe('pdDevMessage', () => {
        it('should update PdDev-related characteristics when is requested', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

          await accessory.initializeDefaultValues();

          expect(thermostatAirConditionerServiceMock.updateCurrentTemperature).toHaveBeenCalledWith(33);
        });

        it('should not update PdDev-related characteristics when is requested and quotas were not initialized properly for it', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as WaveAllQuotaData);

          await accessory.initializeDefaultValues();

          expect(thermostatAirConditionerServiceMock.updateCurrentTemperature).not.toHaveBeenCalled();
        });
      });
    });

    describe('updatePowerInitialValues', () => {
      it('should update POWER-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletBatteryServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletBatteryServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.2);
        expect(outletBatteryServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.3);
        expect(outletBatteryServiceMock.updateOutputCurrent).toHaveBeenCalledWith(2.1);
        expect(outletBatteryServiceMock.updateOutputVoltage).toHaveBeenCalledWith(2.4);
      });

      it('should not update POWER-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as WaveAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateOutputCurrent).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateOutputVoltage).not.toHaveBeenCalled();
      });
    });
  });
});
