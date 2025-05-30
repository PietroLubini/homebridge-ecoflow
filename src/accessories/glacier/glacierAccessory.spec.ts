import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { GlacierAccessory } from '@ecoflow/accessories/glacier/glacierAccessory';
import { SwitchDetachIceService } from '@ecoflow/accessories/glacier/services/switchDetachIceService';
import { SwitchEcoModeService } from '@ecoflow/accessories/glacier/services/switchEcoModeService';
import { SwitchMakeIceService } from '@ecoflow/accessories/glacier/services/switchMakeIceService';
import { ThermostatFridgeDualLeftZoneService } from '@ecoflow/accessories/glacier/services/thermostatFridgeDualLeftZoneService';
import { ThermostatFridgeDualRightZoneService } from '@ecoflow/accessories/glacier/services/thermostatFridgeDualRightZoneService';
import { ThermostatFridgeSingleZoneService } from '@ecoflow/accessories/glacier/services/thermostatFridgeSingleZoneService';
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
  ContactSensorType,
  CoolingZoneType,
  CoolModeType,
  DetachIceStatusType,
  EmsStatus,
  GlacierAllQuotaData,
  MakeIceStatusType,
  PdStatus,
  TemperatureType,
} from '@ecoflow/accessories/glacier/interfaces/glacierHttpApiContracts';
import {
  GlacierMqttMessageType,
  GlacierMqttQuotaMessageWithParams,
  IceCubeShapeType,
} from '@ecoflow/accessories/glacier/interfaces/glacierMqttApiContracts';
import { GlacierThermostatFridgeServiceBase } from '@ecoflow/accessories/glacier/services/glacierThermostatFridgeServiceBase';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { EnableType, FridgeStateType } from '@ecoflow/characteristics/characteristicContracts';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { ContactSensorService } from '@ecoflow/services/contactSensorService';
import { OutletBatteryServiceBase } from '@ecoflow/services/outletBatteryServiceBase';
import { OutletReadOnlyService } from '@ecoflow/services/outletReadOnlyService';
import { SwitchServiceBase } from '@ecoflow/services/switchServiceBase';

jest.mock('@ecoflow/services/outletReadOnlyService');
jest.mock('@ecoflow/accessories/glacier/services/switchDetachIceService');
jest.mock('@ecoflow/accessories/glacier/services/switchEcoModeService');
jest.mock('@ecoflow/accessories/glacier/services/switchMakeIceService');
jest.mock('@ecoflow/accessories/glacier/services/thermostatFridgeDualLeftZoneService');
jest.mock('@ecoflow/accessories/glacier/services/thermostatFridgeDualRightZoneService');
jest.mock('@ecoflow/accessories/glacier/services/thermostatFridgeSingleZoneService');
jest.mock('@ecoflow/services/accessoryInformationService');
jest.mock('@ecoflow/services/batteryStatusService');
jest.mock('@ecoflow/services/contactSensorService');

describe('GlacierAccessory', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;
  let accessory: GlacierAccessory;
  let batteryStatusProviderMock: jest.Mocked<BatteryStatusProvider>;
  let batteryStatusServiceMock: jest.Mocked<BatteryStatusService>;
  let contactSensorDoorServiceMock: jest.Mocked<ContactSensorService>;
  let outletBatteryServiceMock: jest.Mocked<OutletReadOnlyService>;
  let switchDetachIceServiceMock: jest.Mocked<SwitchDetachIceService>;
  let switchEcoModeServiceMock: jest.Mocked<SwitchEcoModeService>;
  let switchMakeIceSmallServiceMock: jest.Mocked<SwitchMakeIceService>;
  let switchMakeIceLargeServiceMock: jest.Mocked<SwitchMakeIceService>;
  let fridgeDualLeftZoneServiceMock: jest.Mocked<ThermostatFridgeDualLeftZoneService>;
  let fridgeDualRightZoneServiceMock: jest.Mocked<ThermostatFridgeDualRightZoneService>;
  let fridgeSingleZoneServiceMock: jest.Mocked<ThermostatFridgeSingleZoneService>;
  let accessoryInformationServiceMock: jest.Mocked<AccessoryInformationService>;
  const expectedServices: MockService[] = [
    {
      Name: 'BatteryStatusService',
    },
    {
      Name: 'ThermostatFridgeDualLeftZoneService',
    },
    {
      Name: 'ThermostatFridgeDualRightZoneService',
    },
    {
      Name: 'ThermostatFridgeSingleZoneService',
    },
    {
      Name: 'SwitchEcoModeService',
    },
    {
      Name: 'ContactSensorService',
    },
    {
      Name: 'OutletReadOnlyService',
    },
    {
      Name: 'SwitchMakeIceService',
    },
    {
      Name: 'SwitchMakeIceService',
    },
    {
      Name: 'SwitchDetachIceService',
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

    function createFridgeService<TService extends GlacierThermostatFridgeServiceBase>(service: TService): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<GlacierThermostatFridgeServiceBase>;
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

    function createSwitchService<TService extends SwitchServiceBase>(service: TService): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<SwitchServiceBase>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      serviceBaseMock.updateEnabled.mockReset();
      serviceBaseMock.updateState.mockReset();
      return serviceMock;
    }

    function createContactSensorService<TService extends ContactSensorService>(service: TService): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<ContactSensorService>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      serviceBaseMock.updateEnabled.mockReset();
      serviceBaseMock.updateState.mockReset();
      return serviceMock;
    }

    batteryStatusProviderMock = {} as jest.Mocked<BatteryStatusProvider>;
    batteryStatusServiceMock = createBatteryStatusService(new BatteryStatusService(accessory, batteryStatusProviderMock));
    (BatteryStatusService as unknown as jest.Mock).mockImplementation(() => batteryStatusServiceMock);

    fridgeDualLeftZoneServiceMock = createFridgeService(new ThermostatFridgeDualLeftZoneService(accessory));
    (ThermostatFridgeDualLeftZoneService as unknown as jest.Mock).mockImplementation(() => fridgeDualLeftZoneServiceMock);

    fridgeDualRightZoneServiceMock = createFridgeService(new ThermostatFridgeDualRightZoneService(accessory));
    (ThermostatFridgeDualRightZoneService as unknown as jest.Mock).mockImplementation(() => fridgeDualRightZoneServiceMock);

    fridgeSingleZoneServiceMock = createFridgeService(new ThermostatFridgeSingleZoneService(accessory));
    (ThermostatFridgeSingleZoneService as unknown as jest.Mock).mockImplementation(() => fridgeSingleZoneServiceMock);

    switchEcoModeServiceMock = createSwitchService(new SwitchEcoModeService(accessory));
    (SwitchEcoModeService as unknown as jest.Mock).mockImplementation(() => switchEcoModeServiceMock);

    switchDetachIceServiceMock = createSwitchService(new SwitchDetachIceService(accessory));
    (SwitchDetachIceService as unknown as jest.Mock).mockImplementation(() => switchDetachIceServiceMock);

    switchMakeIceSmallServiceMock = createSwitchService(new SwitchMakeIceService(accessory, IceCubeShapeType.Small));
    switchMakeIceLargeServiceMock = createSwitchService(new SwitchMakeIceService(accessory, IceCubeShapeType.Large));
    (SwitchMakeIceService as unknown as jest.Mock).mockImplementation((_: EcoFlowAccessoryBase, iceCubeShapeType: IceCubeShapeType) => {
      switch (iceCubeShapeType) {
        case IceCubeShapeType.Small:
          return switchMakeIceSmallServiceMock;
        case IceCubeShapeType.Large:
          return switchMakeIceLargeServiceMock;
        default:
          return undefined;
      }
    });

    outletBatteryServiceMock = createOutletBatteryService(
      new OutletReadOnlyService(accessory, batteryStatusProviderMock, 'Battery', config?.battery?.additionalCharacteristics)
    );
    (OutletReadOnlyService as unknown as jest.Mock).mockImplementation(() => outletBatteryServiceMock);

    contactSensorDoorServiceMock = createContactSensorService(new ContactSensorService(accessory, 'Door'));
    (ContactSensorService as jest.Mock).mockImplementation(() => contactSensorDoorServiceMock);

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
    accessory = new GlacierAccessory(platformMock, accessoryMock, config, logMock, httpApiManagerMock, mqttApiManagerMock, batteryStatusProviderMock);
  });

  describe('initialize', () => {
    it('should add required services when initializing accessory', async () => {
      await accessory.initialize();
      const actual = getActualServices(accessory);

      expect(actual).toEqual(expectedServices);
      expect(batteryStatusServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(fridgeDualLeftZoneServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(fridgeDualRightZoneServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(fridgeSingleZoneServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(switchEcoModeServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(contactSensorDoorServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(outletBatteryServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(switchMakeIceSmallServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(switchMakeIceLargeServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(switchDetachIceServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });

    describe('contactSensorService', () => {
      function run(deviceConfig: DeviceConfig): string | undefined {
        let actual: string | undefined;
        (ContactSensorService as jest.Mock).mockImplementation((_: EcoFlowAccessoryBase, serviceSubName: string) => {
          actual = serviceSubName;
          return contactSensorDoorServiceMock;
        });

        new GlacierAccessory(platformMock, accessoryMock, deviceConfig, logMock, httpApiManagerMock, mqttApiManagerMock, batteryStatusProviderMock);
        return actual;
      }

      describe('serviceSubName', () => {
        it('should initialize contact sensor service with permanent name when it is created', () => {
          const actual = run(config);

          expect(actual).toEqual('Door');
        });
      });
    });
  });

  describe('processQuotaMessage', () => {
    let quota: GlacierAllQuotaData;

    beforeEach(() => {
      quota = {} as GlacierAllQuotaData;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);
    });

    describe('updateEmsStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.bms_emsStatus = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update ems status in quota when EmsStatus message is received', async () => {
        const message: GlacierMqttQuotaMessageWithParams<EmsStatus> = {
          typeCode: GlacierMqttMessageType.EMS,
          params: {
            lcdSoc: 34.67,
            minDsgSoc: 32.1,
          },
        };

        processQuotaMessage(message);
        const actual = quota.bms_emsStatus;

        expect(actual).toEqual(message.params);
      });

      it('should update battery level when EmsStatus message is received with lcdSoc', async () => {
        const message: GlacierMqttQuotaMessageWithParams<EmsStatus> = {
          typeCode: GlacierMqttMessageType.EMS,
          params: {
            lcdSoc: 34.67,
            minDsgSoc: 32.1,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 32.1);
        expect(outletBatteryServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 32.1);
      });

      it('should not update any characteristic when EmsStatus message is received with undefined status', async () => {
        const message: GlacierMqttQuotaMessageWithParams<EmsStatus> = {
          typeCode: GlacierMqttMessageType.EMS,
          params: {},
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
      });
    });

    describe('updateBmsStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.bms_bmsStatus = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update bams status in quota when BmsStatus message is received', async () => {
        const message: GlacierMqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: GlacierMqttMessageType.BMS,
          params: {
            inWatts: 12.34,
          },
        };

        processQuotaMessage(message);
        const actual = quota.bms_bmsStatus;

        expect(actual).toEqual(message.params);
      });

      it(`should update charging state to true
          when BmsStatus message is received with non zero inWatts and without outWatts`, async () => {
        const message: GlacierMqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: GlacierMqttMessageType.BMS,
          params: {
            inWatts: 12.34,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletBatteryServiceMock.updateChargingState).toHaveBeenCalledWith(true);
      });

      it(`should update charging state to true
          when BmsStatus message is received with non zero inWatts and non equal to it outWatts`, async () => {
        const message: GlacierMqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: GlacierMqttMessageType.BMS,
          params: {
            inWatts: 12.34,
            outWatts: 30.45,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletBatteryServiceMock.updateChargingState).toHaveBeenCalledWith(true);
      });

      it(`should update charging state to false
          when BmsStatus message is received with zero inWatts and non equal to it outWatts`, async () => {
        const message: GlacierMqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: GlacierMqttMessageType.BMS,
          params: {
            inWatts: 0,
            outWatts: 30.45,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletBatteryServiceMock.updateChargingState).toHaveBeenCalledWith(false);
      });

      it(`should update charging state to false
          when BmsStatus message is received with zero inWatts and outWatts`, async () => {
        const message: GlacierMqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: GlacierMqttMessageType.BMS,
          params: {
            inWatts: 0,
            outWatts: 0,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletBatteryServiceMock.updateChargingState).toHaveBeenCalledWith(false);
      });

      it('should update battery outlet input consumptions when BmsStatus message is received with inWatts', async () => {
        const message: GlacierMqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: GlacierMqttMessageType.BMS,
          params: {
            inWatts: 12.34,
          },
        };

        processQuotaMessage(message);

        expect(outletBatteryServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
      });

      it('should update battery outlet output watts consumption when BmsStatus message is received with outWatts', async () => {
        const message: GlacierMqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: GlacierMqttMessageType.BMS,
          params: {
            outWatts: 45.67,
          },
        };

        processQuotaMessage(message);

        expect(outletBatteryServiceMock.updateOutputConsumption).toHaveBeenCalledWith(45.67);
      });

      it('should not update any characteristic when BmsStatus message is received with undefined status', async () => {
        const message: GlacierMqttQuotaMessageWithParams<BmsStatus> = {
          typeCode: GlacierMqttMessageType.BMS,
          params: {},
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
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
        const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
          typeCode: GlacierMqttMessageType.PD,
          params: {
            coolMode: CoolModeType.Normal,
          },
        };

        processQuotaMessage(message);
        const actual = quota.pd;

        expect(actual).toEqual(message.params);
      });

      it('should not update any characteristic when PdStatus message is received with undefined status', async () => {
        const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
          typeCode: GlacierMqttMessageType.PD,
          params: {},
        };

        processQuotaMessage(message);

        expect(fridgeSingleZoneServiceMock.updateTargetState).not.toHaveBeenCalled();
        expect(fridgeSingleZoneServiceMock.updateEnabled).not.toHaveBeenCalled();
        expect(fridgeSingleZoneServiceMock.updateCurrentTemperature).not.toHaveBeenCalled();
        expect(fridgeSingleZoneServiceMock.updateTargetTemperature).not.toHaveBeenCalled();
        expect(fridgeDualLeftZoneServiceMock.updateTargetState).not.toHaveBeenCalled();
        expect(fridgeDualLeftZoneServiceMock.updateEnabled).not.toHaveBeenCalled();
        expect(fridgeDualLeftZoneServiceMock.updateCurrentTemperature).not.toHaveBeenCalled();
        expect(fridgeDualLeftZoneServiceMock.updateTargetTemperature).not.toHaveBeenCalled();
        expect(fridgeDualRightZoneServiceMock.updateTargetState).not.toHaveBeenCalled();
        expect(fridgeDualRightZoneServiceMock.updateEnabled).not.toHaveBeenCalled();
        expect(fridgeDualRightZoneServiceMock.updateCurrentTemperature).not.toHaveBeenCalled();
        expect(fridgeDualRightZoneServiceMock.updateTargetTemperature).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateState).not.toHaveBeenCalled();
        expect(switchEcoModeServiceMock.updateState).not.toHaveBeenCalled();
        expect(contactSensorDoorServiceMock.updateState).not.toHaveBeenCalled();
        expect(switchMakeIceSmallServiceMock.updateEnabled).not.toHaveBeenCalled();
        expect(switchMakeIceSmallServiceMock.updateState).not.toHaveBeenCalled();
        expect(switchMakeIceLargeServiceMock.updateEnabled).not.toHaveBeenCalled();
        expect(switchMakeIceLargeServiceMock.updateState).not.toHaveBeenCalled();
        expect(switchDetachIceServiceMock.updateEnabled).not.toHaveBeenCalled();
        expect(switchDetachIceServiceMock.updateState).not.toHaveBeenCalled();
      });

      describe('updateFridgeZonesValues', () => {
        it('Should update target state to On when PdStatus message is received with pwrState equal to On', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              pwrState: EnableType.On,
            },
          };

          processQuotaMessage(message);

          expect(fridgeSingleZoneServiceMock.updateTargetState).toHaveBeenCalledWith(FridgeStateType.On);
          expect(fridgeDualLeftZoneServiceMock.updateTargetState).toHaveBeenCalledWith(FridgeStateType.On);
          expect(fridgeDualRightZoneServiceMock.updateTargetState).toHaveBeenCalledWith(FridgeStateType.On);
          expect(outletBatteryServiceMock.updateState).toHaveBeenCalledWith(true);
        });

        it('Should update target state to Off when PdStatus message is received with pwrState equal to Off', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              pwrState: EnableType.Off,
            },
          };

          processQuotaMessage(message);

          expect(fridgeSingleZoneServiceMock.updateTargetState).toHaveBeenCalledWith(FridgeStateType.Off);
          expect(fridgeDualLeftZoneServiceMock.updateTargetState).toHaveBeenCalledWith(FridgeStateType.Off);
          expect(fridgeDualRightZoneServiceMock.updateTargetState).toHaveBeenCalledWith(FridgeStateType.Off);
          expect(outletBatteryServiceMock.updateState).toHaveBeenCalledWith(false);
        });

        it('Should activate dual zone services when PdStatus message is received with flagTwoZone equal to Dual', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              flagTwoZone: CoolingZoneType.Dual,
            },
          };

          processQuotaMessage(message);

          expect(fridgeSingleZoneServiceMock.updateEnabled).toHaveBeenCalledWith(false);
          expect(fridgeDualLeftZoneServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(fridgeDualRightZoneServiceMock.updateEnabled).toHaveBeenCalledWith(true);
        });

        it('Should activate single zone service when PdStatus message is received with flagTwoZone equal to Single', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              flagTwoZone: CoolingZoneType.Single,
            },
          };

          processQuotaMessage(message);

          expect(fridgeSingleZoneServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(fridgeDualLeftZoneServiceMock.updateEnabled).toHaveBeenCalledWith(false);
          expect(fridgeDualRightZoneServiceMock.updateEnabled).toHaveBeenCalledWith(false);
        });

        it('Should update current temperature of dual left zone service when PdStatus message is received with tmpL', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              tmpL: 12.67,
            },
          };

          processQuotaMessage(message);

          expect(fridgeDualLeftZoneServiceMock.updateCurrentTemperature).toHaveBeenCalledWith(12.67);
        });

        it('Should update current temperature of dual right zone service when PdStatus message is received with tmpR', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              tmpR: 34.57,
            },
          };

          processQuotaMessage(message);

          expect(fridgeDualRightZoneServiceMock.updateCurrentTemperature).toHaveBeenCalledWith(34.57);
        });

        it('Should update current temperature of single zone service when PdStatus message is received with tmpAver', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              tmpAver: 23.21,
            },
          };

          processQuotaMessage(message);

          expect(fridgeSingleZoneServiceMock.updateCurrentTemperature).toHaveBeenCalledWith(23.21);
        });

        it('Should update target temperature of dual left zone service when PdStatus message is received with tmpLSet', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              tmpLSet: 64.34,
            },
          };

          processQuotaMessage(message);

          expect(fridgeDualLeftZoneServiceMock.updateTargetTemperature).toHaveBeenCalledWith(64.34);
        });

        it('Should update target temperature of dual right zone service when PdStatus message is received with tmpRSet', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              tmpRSet: 67.12,
            },
          };

          processQuotaMessage(message);

          expect(fridgeDualRightZoneServiceMock.updateTargetTemperature).toHaveBeenCalledWith(67.12);
        });

        it('Should update target temperature of single zone service when PdStatus message is received with tmpMSet', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              tmpMSet: 13.45,
            },
          };

          processQuotaMessage(message);

          expect(fridgeSingleZoneServiceMock.updateTargetTemperature).toHaveBeenCalledWith(13.45);
        });
      });

      describe('updateStateValues', () => {
        it('Should update ECO mode to true when PdStatus message is received with coolMode equal to Eco', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              coolMode: CoolModeType.Eco,
            },
          };

          processQuotaMessage(message);

          expect(switchEcoModeServiceMock.updateState).toHaveBeenCalledWith(true);
        });

        it('Should update ECO mode to false when PdStatus message is received with coolMode equal to Normal', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              coolMode: CoolModeType.Normal,
            },
          };

          processQuotaMessage(message);

          expect(switchEcoModeServiceMock.updateState).toHaveBeenCalledWith(false);
        });

        it('Should update door status to true when PdStatus message is received with doorStat equal to Closed', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              doorStat: ContactSensorType.Closed,
            },
          };

          processQuotaMessage(message);

          expect(contactSensorDoorServiceMock.updateState).toHaveBeenCalledWith(true);
        });

        it('Should update door status to false when PdStatus message is received with doorStat equal to Opened', async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              doorStat: ContactSensorType.Opened,
            },
          };

          processQuotaMessage(message);

          expect(contactSensorDoorServiceMock.updateState).toHaveBeenCalledWith(false);
        });
      });

      describe('updateIceMakingValues', () => {
        it(`Should leave enabled Make Small Ice Cubes service
            when PdStatus message is received with iceMkMode equal to SmallInPreparation`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              iceMkMode: MakeIceStatusType.SmallInPreparation,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(switchMakeIceLargeServiceMock.updateEnabled).toHaveBeenCalledWith(false);
          expect(switchDetachIceServiceMock.updateEnabled).toHaveBeenCalledWith(false);
        });

        it(`Should leave enabled Make Small Ice Cubes service
            when PdStatus message is received with iceMkMode equal to SmallInProgress`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              iceMkMode: MakeIceStatusType.SmallInProgress,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(switchMakeIceLargeServiceMock.updateEnabled).toHaveBeenCalledWith(false);
          expect(switchDetachIceServiceMock.updateEnabled).toHaveBeenCalledWith(false);
        });

        it(`Should leave enabled Make Large Ice Cubes service
            when PdStatus message is received with iceMkMode equal to LargeInPreparation`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              iceMkMode: MakeIceStatusType.LargeInPreparation,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateEnabled).toHaveBeenCalledWith(false);
          expect(switchMakeIceLargeServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(switchDetachIceServiceMock.updateEnabled).toHaveBeenCalledWith(false);
        });

        it(`Should leave enabled Make Large Ice Cubes service
            when PdStatus message is received with iceMkMode equal to LargeInProgress`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              iceMkMode: MakeIceStatusType.LargeInProgress,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateEnabled).toHaveBeenCalledWith(false);
          expect(switchMakeIceLargeServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(switchDetachIceServiceMock.updateEnabled).toHaveBeenCalledWith(false);
        });

        it(`Should set active Make Small Ice Cubes service
            when PdStatus message is received with iceMkMode equal to SmallInPreparation`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              iceMkMode: MakeIceStatusType.SmallInPreparation,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateState).toHaveBeenCalledWith(true);
          expect(switchMakeIceLargeServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(switchDetachIceServiceMock.updateState).toHaveBeenCalledWith(false);
        });

        it(`Should set active Make Small Ice Cubes service
            when PdStatus message is received with iceMkMode equal to SmallInProgress`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              iceMkMode: MakeIceStatusType.SmallInProgress,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateState).toHaveBeenCalledWith(true);
          expect(switchMakeIceLargeServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(switchDetachIceServiceMock.updateState).toHaveBeenCalledWith(false);
        });

        it(`Should set active Make Large Ice Cubes service
            when PdStatus message is received with iceMkMode equal to LargeInPreparation`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              iceMkMode: MakeIceStatusType.LargeInPreparation,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(switchMakeIceLargeServiceMock.updateState).toHaveBeenCalledWith(true);
          expect(switchDetachIceServiceMock.updateState).toHaveBeenCalledWith(false);
        });

        it(`Should set active Make Large Ice Cubes service
            when PdStatus message is received with iceMkMode equal to LargeInProgress`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              iceMkMode: MakeIceStatusType.LargeInProgress,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(switchMakeIceLargeServiceMock.updateState).toHaveBeenCalledWith(true);
          expect(switchDetachIceServiceMock.updateState).toHaveBeenCalledWith(false);
        });

        it(`Should enable Make Small and Large Ice Cubes services
            when PdStatus message is received with icePercent equal to 100`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              icePercent: 100,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(switchMakeIceLargeServiceMock.updateEnabled).toHaveBeenCalledWith(true);
        });

        it(`Should not enable Make Small and Large Ice Cubes services
            when PdStatus message is received with icePercent that is not equal to 100`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              icePercent: 99,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateEnabled).not.toHaveBeenCalled();
          expect(switchMakeIceLargeServiceMock.updateEnabled).not.toHaveBeenCalled();
        });

        it(`Should leave enabled Detach Ice service
            when PdStatus message is received with fsmState equal to InProgress`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              fsmState: DetachIceStatusType.InProgress,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateEnabled).toHaveBeenCalledWith(false);
          expect(switchMakeIceLargeServiceMock.updateEnabled).toHaveBeenCalledWith(false);
          expect(switchDetachIceServiceMock.updateEnabled).toHaveBeenCalledWith(true);
        });

        it(`Should enabled Detach Ice and Make Ice services
            when PdStatus message is received with fsmState equal to Completed`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              fsmState: DetachIceStatusType.Completed,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(switchMakeIceLargeServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(switchDetachIceServiceMock.updateEnabled).toHaveBeenCalledWith(true);
        });

        it(`Should set active Detach Ice service
            when PdStatus message is received with fsmState equal to InProgress`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              fsmState: DetachIceStatusType.InProgress,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(switchMakeIceLargeServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(switchDetachIceServiceMock.updateState).toHaveBeenCalledWith(true);
        });

        it(`Should set deactivate Detach Ice service
            when PdStatus message is received with fsmState equal to Completed`, async () => {
          const message: GlacierMqttQuotaMessageWithParams<PdStatus> = {
            typeCode: GlacierMqttMessageType.PD,
            params: {
              fsmState: DetachIceStatusType.Completed,
            },
          };

          processQuotaMessage(message);

          expect(switchMakeIceSmallServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(switchMakeIceLargeServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(switchDetachIceServiceMock.updateState).toHaveBeenCalledWith(false);
        });
      });
    });
  });

  describe('initializeQuota', () => {
    let quota: GlacierAllQuotaData;
    beforeEach(() => {
      quota = {
        bms_emsStatus: {
          lcdSoc: 1.1,
          minDsgSoc: 1.2,
        },
        bms_bmsStatus: {
          amp: 2.1,
          inWatts: 2.2,
          outWatts: 2.3,
          vol: 2.4,
        },
        pd: {
          coolMode: CoolModeType.Eco,
          doorStat: ContactSensorType.Opened,
          flagTwoZone: CoolingZoneType.Dual,
          fsmState: DetachIceStatusType.InProgress,
          iceMkMode: MakeIceStatusType.LargeInProgress,
          icePercent: 3.1,
          pwrState: EnableType.On,
          tmpAver: 3.2,
          tmpL: 3.4,
          tmpLSet: 3.5,
          tmpMSet: 3.6,
          tmpR: 3.7,
          tmpRSet: 3.8,
          tmpUnit: TemperatureType.Fahrenheit,
        },
      };
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: GlacierAllQuotaData = { bms_bmsStatus: {}, bms_emsStatus: {}, pd: {} };

      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });
    describe('updateEmsValues', () => {
      it('should update EmsStatus-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 1.2);
        expect(outletBatteryServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 1.2);
      });

      it('should not update EmsStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as GlacierAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
      });
    });

    describe('updateBmsValues', () => {
      it('should update BmsStatus-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletBatteryServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletBatteryServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.2);
        expect(outletBatteryServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.3);
      });

      it('should not update BmsStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as GlacierAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletBatteryServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });
    });

    describe('updatePdValues', () => {
      describe('updateFridgeZonesValues', () => {
        it('should update PdStatus-related characteristics when is requested', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

          await accessory.initializeDefaultValues();

          expect(fridgeSingleZoneServiceMock.updateTargetState).toHaveBeenCalledWith(FridgeStateType.On);
          expect(fridgeSingleZoneServiceMock.updateEnabled).toHaveBeenCalledWith(false);
          expect(fridgeSingleZoneServiceMock.updateCurrentTemperature).toHaveBeenCalledWith(3.2);
          expect(fridgeSingleZoneServiceMock.updateTargetTemperature).toHaveBeenCalledWith(3.6);
          expect(fridgeDualLeftZoneServiceMock.updateTargetState).toHaveBeenCalledWith(FridgeStateType.On);
          expect(fridgeDualLeftZoneServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(fridgeDualLeftZoneServiceMock.updateCurrentTemperature).toHaveBeenCalledWith(3.4);
          expect(fridgeDualLeftZoneServiceMock.updateTargetTemperature).toHaveBeenCalledWith(3.5);
          expect(fridgeDualRightZoneServiceMock.updateTargetState).toHaveBeenCalledWith(FridgeStateType.On);
          expect(fridgeDualRightZoneServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(fridgeDualRightZoneServiceMock.updateCurrentTemperature).toHaveBeenCalledWith(3.7);
          expect(fridgeDualRightZoneServiceMock.updateTargetTemperature).toHaveBeenCalledWith(3.8);
          expect(outletBatteryServiceMock.updateState).toHaveBeenCalledWith(true);
        });

        it('should not update PdStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as GlacierAllQuotaData);

          await accessory.initializeDefaultValues();

          expect(fridgeSingleZoneServiceMock.updateTargetState).not.toHaveBeenCalled();
          expect(fridgeSingleZoneServiceMock.updateEnabled).not.toHaveBeenCalled();
          expect(fridgeSingleZoneServiceMock.updateCurrentTemperature).not.toHaveBeenCalled();
          expect(fridgeSingleZoneServiceMock.updateTargetTemperature).not.toHaveBeenCalled();
          expect(fridgeDualLeftZoneServiceMock.updateTargetState).not.toHaveBeenCalled();
          expect(fridgeDualLeftZoneServiceMock.updateEnabled).not.toHaveBeenCalled();
          expect(fridgeDualLeftZoneServiceMock.updateCurrentTemperature).not.toHaveBeenCalled();
          expect(fridgeDualLeftZoneServiceMock.updateTargetTemperature).not.toHaveBeenCalled();
          expect(fridgeDualRightZoneServiceMock.updateTargetState).not.toHaveBeenCalled();
          expect(fridgeDualRightZoneServiceMock.updateEnabled).not.toHaveBeenCalled();
          expect(fridgeDualRightZoneServiceMock.updateCurrentTemperature).not.toHaveBeenCalled();
          expect(fridgeDualRightZoneServiceMock.updateTargetTemperature).not.toHaveBeenCalled();
          expect(outletBatteryServiceMock.updateState).not.toHaveBeenCalled();
        });
      });

      describe('updateStateValues', () => {
        it('should update PdStatus-related characteristics when is requested', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

          await accessory.initializeDefaultValues();

          expect(switchEcoModeServiceMock.updateState).toHaveBeenCalledWith(true);
          expect(contactSensorDoorServiceMock.updateState).toHaveBeenCalledWith(false);
        });

        it('should not update PdStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as GlacierAllQuotaData);

          await accessory.initializeDefaultValues();

          expect(switchEcoModeServiceMock.updateState).not.toHaveBeenCalled();
          expect(contactSensorDoorServiceMock.updateState).not.toHaveBeenCalled();
        });
      });

      describe('updateIceMakingValues', () => {
        it('should update PdStatus-related characteristics when is requested', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

          await accessory.initializeDefaultValues();

          expect(switchMakeIceSmallServiceMock.updateEnabled).toHaveBeenCalledWith(false);
          expect(switchMakeIceSmallServiceMock.updateState).toHaveBeenCalledWith(false);
          expect(switchMakeIceLargeServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(switchMakeIceLargeServiceMock.updateState).toHaveBeenCalledWith(true);
          expect(switchDetachIceServiceMock.updateEnabled).toHaveBeenCalledWith(true);
          expect(switchDetachIceServiceMock.updateState).toHaveBeenCalledWith(true);
        });

        it('should not update PdStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as GlacierAllQuotaData);

          await accessory.initializeDefaultValues();

          expect(switchMakeIceSmallServiceMock.updateEnabled).not.toHaveBeenCalled();
          expect(switchMakeIceSmallServiceMock.updateState).not.toHaveBeenCalled();
          expect(switchMakeIceLargeServiceMock.updateEnabled).not.toHaveBeenCalled();
          expect(switchMakeIceLargeServiceMock.updateState).not.toHaveBeenCalled();
          expect(switchDetachIceServiceMock.updateEnabled).not.toHaveBeenCalled();
          expect(switchDetachIceServiceMock.updateState).not.toHaveBeenCalled();
        });
      });
    });
  });
});
