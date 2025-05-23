import { Delta2AccessoryBase } from '@ecoflow/accessories/batteries/delta2/delta2AccessoryBase';
import {
  Delta2AllQuotaData,
  EmsStatus,
  InvStatus,
  MpptStatus,
  PdStatus,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2HttpApiContracts';
import {
  Delta2MqttMessageType,
  Delta2MqttQuotaMessageWithParams,
  Delta2MqttSetModuleType,
} from '@ecoflow/accessories/batteries/delta2/interfaces/delta2MqttApiContracts';
import { OutletAcService } from '@ecoflow/accessories/batteries/delta2/services/outletAcService';
import { OutletCarService } from '@ecoflow/accessories/batteries/delta2/services/outletCarService';
import { OutletUsbService } from '@ecoflow/accessories/batteries/delta2/services/outletUsbService';
import { SwitchXboostService } from '@ecoflow/accessories/batteries/delta2/services/switchXboostService';
import { AcEnableType, AcXBoostType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';
import { DeviceConfig } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { getActualServices, MockService } from '@ecoflow/helpers/tests/accessoryTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { OutletBatteryServiceBase } from '@ecoflow/services/outletBatteryServiceBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

jest.mock('@ecoflow/services/batteryStatusService');
jest.mock('@ecoflow/accessories/batteries/delta2/services/outletUsbService');
jest.mock('@ecoflow/accessories/batteries/delta2/services/outletAcService');
jest.mock('@ecoflow/accessories/batteries/delta2/services/outletCarService');
jest.mock('@ecoflow/accessories/batteries/delta2/services/switchXboostService');
jest.mock('@ecoflow/services/accessoryInformationService');

class MockAccessory extends Delta2AccessoryBase {}

describe('Delta2AccessoryBase', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;
  let accessory: MockAccessory;
  let batteryStatusServiceMock: jest.Mocked<BatteryStatusService>;
  let outletUsbServiceMock: jest.Mocked<OutletUsbService>;
  let outletAcServiceMock: jest.Mocked<OutletAcService>;
  let outletCarServiceMock: jest.Mocked<OutletCarService>;
  let switchXboostServiceMock: jest.Mocked<SwitchXboostService>;
  let batteryStatusProviderMock: jest.Mocked<BatteryStatusProvider>;
  let accessoryInformationServiceMock: jest.Mocked<AccessoryInformationService>;
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
      Name: 'SwitchXboostService',
    },
    {
      Name: 'AccessoryInformationService',
    },
  ];

  beforeEach(() => {
    function initService<TService extends ServiceBase>(
      Module: object,
      service: TService,
      mockResetCallback: ((serviceMock: jest.Mocked<TService>) => void) | null = null
    ): jest.Mocked<TService> {
      const serviceMock = service as jest.Mocked<TService>;
      const serviceBaseMock = serviceMock as jest.Mocked<ServiceBase>;
      serviceBaseMock.initialize.mockReset();
      serviceBaseMock.cleanupCharacteristics.mockReset();
      if (mockResetCallback) {
        mockResetCallback(serviceMock);
      }
      (Module as jest.Mock).mockImplementation(() => serviceMock);
      return serviceMock;
    }

    function initOutletService<TService extends OutletBatteryServiceBase>(
      Module: object,
      service: TService
    ): jest.Mocked<TService> {
      return initService(Module, service, mock => {
        const mockOutletBase = mock as jest.Mocked<OutletBatteryServiceBase>;
        mockOutletBase.updateBatteryLevel.mockReset();
        mockOutletBase.updateChargingState.mockReset();
        mockOutletBase.updateInputConsumption.mockReset();
        mockOutletBase.updateOutputConsumption.mockReset();
        mockOutletBase.updateState.mockReset();
      });
    }
    batteryStatusServiceMock = initService(
      BatteryStatusService,
      new BatteryStatusService(accessory, batteryStatusProviderMock),
      mock => {
        mock.updateBatteryLevel.mockReset();
        mock.updateChargingState.mockReset();
      }
    );
    outletUsbServiceMock = initOutletService(
      OutletUsbService,
      new OutletUsbService(accessory, batteryStatusProviderMock)
    );
    outletAcServiceMock = initOutletService(
      OutletAcService,
      new OutletAcService(accessory, batteryStatusProviderMock, Delta2MqttSetModuleType.INV)
    );
    outletCarServiceMock = initOutletService(
      OutletCarService,
      new OutletCarService(accessory, batteryStatusProviderMock)
    );
    accessoryInformationServiceMock = initService(
      AccessoryInformationService,
      new AccessoryInformationService(accessory)
    );
    switchXboostServiceMock = initService(
      SwitchXboostService,
      new SwitchXboostService(accessory, Delta2MqttSetModuleType.MPPT),
      mock => {
        mock.updateState.mockReset();
      }
    );

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
    batteryStatusProviderMock = {} as jest.Mocked<BatteryStatusProvider>;
    accessory = new MockAccessory(
      platformMock,
      accessoryMock,
      config,
      logMock,
      httpApiManagerMock,
      mqttApiManagerMock,
      batteryStatusProviderMock,
      { setAcModuleType: Delta2MqttSetModuleType.BMS }
    );
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
      expect(switchXboostServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });

    it('should create OutletAcService with MPPT setModuleType when initializing accessory MPPT setModuleType', async () => {
      let actual: Delta2MqttSetModuleType | undefined;
      (OutletAcService as unknown as jest.Mock).mockImplementation(
        (
          _ecoFlowAccessory: EcoFlowAccessoryBase,
          _batteryStatusProvider: BatteryStatusProvider,
          setAcModuleType: Delta2MqttSetModuleType
        ) => {
          actual = setAcModuleType;
          return outletAcServiceMock;
        }
      );

      new MockAccessory(
        platformMock,
        accessoryMock,
        config,
        logMock,
        httpApiManagerMock,
        mqttApiManagerMock,
        batteryStatusProviderMock,
        {
          setAcModuleType: Delta2MqttSetModuleType.MPPT,
        }
      );

      expect(actual).toBe(Delta2MqttSetModuleType.MPPT);
    });

    it('should create SwitchXboostService with INV setModuleType when initializing accessory INV setModuleType', async () => {
      let actual: Delta2MqttSetModuleType | undefined;
      (SwitchXboostService as jest.Mock).mockImplementation(
        (_ecoFlowAccessory: EcoFlowAccessoryBase, setAcModuleType: Delta2MqttSetModuleType) => {
          actual = setAcModuleType;
          return switchXboostServiceMock;
        }
      );

      new MockAccessory(
        platformMock,
        accessoryMock,
        config,
        logMock,
        httpApiManagerMock,
        mqttApiManagerMock,
        batteryStatusProviderMock,
        {
          setAcModuleType: Delta2MqttSetModuleType.INV,
        }
      );

      expect(actual).toBe(Delta2MqttSetModuleType.INV);
    });
  });

  describe('processQuotaMessage', () => {
    let quota: Delta2AllQuotaData;

    beforeEach(() => {
      quota = {} as Delta2AllQuotaData;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);
    });

    describe('EmsStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.bms_emsStatus = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update ems status in quota when EmsStatus message is received', async () => {
        const message: Delta2MqttQuotaMessageWithParams<EmsStatus> = {
          typeCode: Delta2MqttMessageType.EMS,
          params: {
            f32LcdShowSoc: 34.67,
            minDsgSoc: 32.1,
          },
        };

        processQuotaMessage(message);
        const actual = quota.bms_emsStatus;

        expect(actual).toEqual(message.params);
      });

      it('should update battery level when EmsStatus message is received with f32ShowSoc', async () => {
        const message: Delta2MqttQuotaMessageWithParams<EmsStatus> = {
          typeCode: Delta2MqttMessageType.EMS,
          params: {
            f32LcdShowSoc: 34.67,
            minDsgSoc: 32.1,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 32.1);
        expect(outletAcServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 32.1);
        expect(outletUsbServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 32.1);
        expect(outletCarServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 32.1);
      });

      it('should not update any characteristic when EmsStatus message is received with undefined status', async () => {
        const message: Delta2MqttQuotaMessageWithParams<EmsStatus> = {
          typeCode: Delta2MqttMessageType.EMS,
          params: {},
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
      });
    });

    describe('InvStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.inv = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update inv status in quota when InvStatus message is received', async () => {
        const message: Delta2MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: Delta2MqttMessageType.INV,
          params: {
            inputWatts: 12.34,
          },
        };

        processQuotaMessage(message);
        const actual = quota.inv;

        expect(actual).toEqual(message.params);
      });

      it(`should update charging state to true
        when InvStatus message is received with non zero inputWatts and without outputWatts`, async () => {
        const message: Delta2MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: Delta2MqttMessageType.INV,
          params: {
            inputWatts: 12.34,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletCarServiceMock.updateChargingState).toHaveBeenCalledWith(true);
      });

      it(`should update charging state to true
        when InvStatus message is received with non zero inputWatts and non equal to it outputWatts`, async () => {
        const message: Delta2MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: Delta2MqttMessageType.INV,
          params: {
            inputWatts: 12.34,
            outputWatts: 30.45,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletCarServiceMock.updateChargingState).toHaveBeenCalledWith(true);
      });

      it(`should update charging state to false
        when InvStatus message is received with zero inputWatts and non equal to it outputWatts`, async () => {
        const message: Delta2MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: Delta2MqttMessageType.INV,
          params: {
            inputWatts: 0,
            outputWatts: 30.45,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletCarServiceMock.updateChargingState).toHaveBeenCalledWith(false);
      });

      it(`should update charging state to false
        when InvStatus message is received with zero inputWatts and outputWatts`, async () => {
        const message: Delta2MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: Delta2MqttMessageType.INV,
          params: {
            inputWatts: 0,
            outputWatts: 0,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletCarServiceMock.updateChargingState).toHaveBeenCalledWith(false);
      });

      it('should update AC, USB, CAR input consumptions when InvStatus message is received with inputWatts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: Delta2MqttMessageType.INV,
          params: {
            inputWatts: 12.34,
          },
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
        expect(outletUsbServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
        expect(outletCarServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
      });

      it('should update AC state when InvStatus message is received with cfgAcEnabled', async () => {
        const message: Delta2MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: Delta2MqttMessageType.INV,
          params: {
            cfgAcEnabled: AcEnableType.On,
          },
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });

      it('should update X-Boost state when InvStatus message is received with cfgAcXboost', async () => {
        const message: Delta2MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: Delta2MqttMessageType.INV,
          params: {
            cfgAcXboost: AcXBoostType.On,
          },
        };

        processQuotaMessage(message);

        expect(switchXboostServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
      });

      it('should update AC output watts consumption when InvStatus message is received with outputWatts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: Delta2MqttMessageType.INV,
          params: {
            outputWatts: 45.67,
          },
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(45.67);
      });

      it('should not update any characteristic when InvStatus message is received with undefined status', async () => {
        const message: Delta2MqttQuotaMessageWithParams<InvStatus> = {
          typeCode: Delta2MqttMessageType.INV,
          params: {},
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });
    });

    describe('PdStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.pd = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update pd status in quota when PdStatus message is received', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            carWatts: 34.12,
          },
        };

        processQuotaMessage(message);
        const actual = quota.pd;

        expect(actual).toEqual(message.params);
      });

      it('should update CAR state when PdStatus message is received with carState', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            carState: EnableType.On,
          },
        };

        processQuotaMessage(message);

        expect(outletCarServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update CAR output consumption when PdStatus message is received with carWatts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            carWatts: 64.89,
          },
        };

        processQuotaMessage(message);

        expect(outletCarServiceMock.updateOutputConsumption).toHaveBeenCalledWith(64.89);
      });

      it('should update USB state when PdStatus message is received with dcOutState', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            dcOutState: EnableType.On,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 usb1Watts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            usb1Watts: 0,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with usb1Watts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            usb1Watts: 1.1,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(1.1);
      });

      it('should update USB output consumption when PdStatus message is received with usb2Watts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            usb2Watts: 2.2,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.2);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 usb2Watts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            usb2Watts: 0,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with qcUsb1Watts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            qcUsb1Watts: 3.3,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(3.3);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 qcUsb1Watts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            qcUsb1Watts: 0,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with qcUsb2Watts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            qcUsb2Watts: 4.4,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(4.4);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 qcUsb2Watts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            qcUsb2Watts: 0,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with typec1Watts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            typec1Watts: 5.5,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(5.5);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 typec1Watts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            typec1Watts: 0,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with typec2Watts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            typec2Watts: 6.6,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(6.6);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 typec2Watts', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            typec2Watts: 0,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with all usb-related parameters', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {
            usb1Watts: 1.1,
            usb2Watts: 2.2,
            qcUsb1Watts: 3.3,
            qcUsb2Watts: 4.4,
            typec1Watts: 5.5,
            typec2Watts: 6.6,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(23.1);
      });

      it('should not update any characteristic when PdStatus message is received with undefined status', async () => {
        const message: Delta2MqttQuotaMessageWithParams<PdStatus> = {
          typeCode: Delta2MqttMessageType.PD,
          params: {},
        };

        processQuotaMessage(message);

        expect(outletCarServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });
    });

    describe('MpptStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.mppt = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update mppt status in quota when MpptStatus message is received', async () => {
        const message: Delta2MqttQuotaMessageWithParams<MpptStatus> = {
          typeCode: Delta2MqttMessageType.MPPT,
          params: {
            cfgAcEnabled: AcEnableType.On,
          },
        };

        processQuotaMessage(message);
        const actual = quota.mppt;

        expect(actual).toEqual(message.params);
      });

      it('should update AC state when MpptStatus message is received with cfgAcEnabled', async () => {
        const message: Delta2MqttQuotaMessageWithParams<MpptStatus> = {
          typeCode: Delta2MqttMessageType.MPPT,
          params: {
            cfgAcEnabled: AcEnableType.On,
          },
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });

      it('should update X-Boost state when MpptStatus message is received with cfgAcXboost', async () => {
        const message: Delta2MqttQuotaMessageWithParams<MpptStatus> = {
          typeCode: Delta2MqttMessageType.MPPT,
          params: {
            cfgAcXboost: AcXBoostType.On,
          },
        };

        processQuotaMessage(message);

        expect(switchXboostServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
      });

      it('should not update any characteristic when MpptStatus message is received with undefined status', async () => {
        const message: Delta2MqttQuotaMessageWithParams<MpptStatus> = {
          typeCode: Delta2MqttMessageType.MPPT,
          params: {},
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });
    });
  });

  describe('initializeDefaultValues', () => {
    let quota: Delta2AllQuotaData;
    beforeEach(() => {
      quota = {
        bms_emsStatus: {
          f32LcdShowSoc: 1.1,
          minDsgSoc: 0.5,
        },
        inv: {
          inputWatts: 2.1,
          cfgAcEnabled: AcEnableType.On,
          cfgAcXboost: AcXBoostType.Off,
          outputWatts: 2.2,
        },
        pd: {
          carState: EnableType.On,
          carWatts: 3.1,
          dcOutState: EnableType.Off,
          qcUsb1Watts: 4,
          typec2Watts: 5,
        },
        mppt: {
          cfgAcEnabled: AcEnableType.Off,
          cfgAcXboost: AcXBoostType.On,
        },
      };
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: Delta2AllQuotaData = { bms_emsStatus: {}, inv: {}, pd: {}, mppt: {} };

      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    describe('EmsStatus', () => {
      it('should update BmsStatus-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 0.5);
        expect(outletAcServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 0.5);
        expect(outletUsbServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 0.5);
        expect(outletCarServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 0.5);
      });

      it('should not update BmsStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as Delta2AllQuotaData);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
      });
    });

    describe('InvStatus', () => {
      it('should update InvStatus-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.1);
        expect(outletAcServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.2);
        expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletUsbServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.1);
        expect(outletCarServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletCarServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.1);
        expect(switchXboostServiceMock.updateState).toHaveBeenCalledWith(false);
      });

      it('should update InvStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as Delta2AllQuotaData);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });
    });

    describe('PdStatus', () => {
      it('should update PdStatus-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(outletUsbServiceMock.updateState).toHaveBeenCalledWith(false);
        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(9);
        expect(outletCarServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(outletCarServiceMock.updateOutputConsumption).toHaveBeenCalledWith(3.1);
      });

      it('should update PdStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as Delta2AllQuotaData);

        await accessory.initializeDefaultValues();

        expect(outletUsbServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });
    });

    describe('MpptStatus', () => {
      it('should update MpptStatus-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(outletAcServiceMock.updateState).toHaveBeenCalledWith(false);
        expect(switchXboostServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update MpptStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as Delta2AllQuotaData);

        await accessory.initializeDefaultValues();

        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });
    });
  });
});
