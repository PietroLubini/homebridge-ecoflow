import { BatteryAccessoryBase } from '@ecoflow/accessories/batteries/batteryAccessoryBase';
import {
  BatteryAllQuotaData,
  BmsStatus,
  InvStatus,
  MpptStatus,
  PdStatus,
} from '@ecoflow/accessories/batteries/interfaces/httpApiBatteryContracts';
import {
  MqttBatteryMessageType,
  MqttBatteryQuotaMessageWithParams,
  MqttBatterySetModuleType,
} from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { OutletAcService } from '@ecoflow/accessories/batteries/services/outletAcService';
import { OutletCarService } from '@ecoflow/accessories/batteries/services/outletCarService';
import { OutletUsbService } from '@ecoflow/accessories/batteries/services/outletUsbService';
import { SwitchXboostService } from '@ecoflow/accessories/batteries/services/switchXboostService';
import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig } from '@ecoflow/config';
import { getActualServices, MockService } from '@ecoflow/helpers/tests/accessoryTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

jest.mock('@ecoflow/services/batteryStatusService');
jest.mock('@ecoflow/accessories/batteries/services/outletUsbService');
jest.mock('@ecoflow/accessories/batteries/services/outletAcService');
jest.mock('@ecoflow/accessories/batteries/services/outletCarService');
jest.mock('@ecoflow/accessories/batteries/services/switchXboostService');
jest.mock('@ecoflow/services/accessoryInformationService');

class MockAccessory extends BatteryAccessoryBase {}

describe('BatteryAccessory', () => {
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

    function initOutletService<TService extends OutletServiceBase>(
      Module: object,
      service: TService
    ): jest.Mocked<TService> {
      return initService(Module, service, mock => {
        const mockOutletBase = mock as jest.Mocked<OutletServiceBase>;
        mockOutletBase.updateBatteryLevel.mockReset();
        mockOutletBase.updateInputConsumption.mockReset();
        mockOutletBase.updateOutputConsumption.mockReset();
        mockOutletBase.updateState.mockReset();
      });
    }
    batteryStatusServiceMock = initService(BatteryStatusService, new BatteryStatusService(accessory), mock => {
      mock.updateBatteryLevel.mockReset();
      mock.updateChargingState.mockReset();
    });
    outletUsbServiceMock = initOutletService(OutletUsbService, new OutletUsbService(accessory));
    outletAcServiceMock = initOutletService(
      OutletAcService,
      new OutletAcService(accessory, MqttBatterySetModuleType.INV)
    );
    outletCarServiceMock = initOutletService(OutletCarService, new OutletCarService(accessory));
    accessoryInformationServiceMock = initService(
      AccessoryInformationService,
      new AccessoryInformationService(accessory)
    );
    switchXboostServiceMock = initService(
      SwitchXboostService,
      new SwitchXboostService(accessory, MqttBatterySetModuleType.MPPT),
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
      subscribeOnQuotaMessage: jest.fn(),
      subscribeOnSetReplyMessage: jest.fn(),
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowMqttApiManager>;
    config = { secretKey: 'secretKey1', accessKey: 'accessKey1', serialNumber: 'sn1' } as unknown as DeviceConfig;
    accessory = new MockAccessory(
      platformMock,
      accessoryMock,
      config,
      logMock,
      httpApiManagerMock,
      mqttApiManagerMock,
      { setAcModuleType: MqttBatterySetModuleType.BMS }
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
      let actual: MqttBatterySetModuleType | undefined;
      (OutletAcService as jest.Mock).mockImplementation(
        (_ecoFlowAccessory: EcoFlowAccessoryBase, setAcModuleType: MqttBatterySetModuleType) => {
          actual = setAcModuleType;
          return outletAcServiceMock;
        }
      );

      new MockAccessory(platformMock, accessoryMock, config, logMock, httpApiManagerMock, mqttApiManagerMock, {
        setAcModuleType: MqttBatterySetModuleType.MPPT,
      });

      expect(actual).toBe(MqttBatterySetModuleType.MPPT);
    });

    it('should create SwitchXboostService with INV setModuleType when initializing accessory INV setModuleType', async () => {
      let actual: MqttBatterySetModuleType | undefined;
      (SwitchXboostService as jest.Mock).mockImplementation(
        (_ecoFlowAccessory: EcoFlowAccessoryBase, setAcModuleType: MqttBatterySetModuleType) => {
          actual = setAcModuleType;
          return switchXboostServiceMock;
        }
      );

      new MockAccessory(platformMock, accessoryMock, config, logMock, httpApiManagerMock, mqttApiManagerMock, {
        setAcModuleType: MqttBatterySetModuleType.INV,
      });

      expect(actual).toBe(MqttBatterySetModuleType.INV);
    });
  });

  describe('processQuotaMessage', () => {
    let quota: BatteryAllQuotaData;

    beforeEach(() => {
      quota = {} as BatteryAllQuotaData;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
    });

    describe('BmsStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.bms_bmsStatus = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update bms status in quota when BmsStatus message is received', async () => {
        const message: MqttBatteryQuotaMessageWithParams<BmsStatus> = {
          typeCode: MqttBatteryMessageType.BMS,
          params: {
            f32ShowSoc: 34.67,
          },
        };

        processQuotaMessage(message);
        const actual = quota.bms_bmsStatus;

        expect(actual).toEqual(message.params);
      });

      it('should update battery level when BmsStatus message is received with f32ShowSoc', async () => {
        const message: MqttBatteryQuotaMessageWithParams<BmsStatus> = {
          typeCode: MqttBatteryMessageType.BMS,
          params: {
            f32ShowSoc: 34.67,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67);
        expect(outletAcServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67);
        expect(outletUsbServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67);
        expect(outletCarServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67);
      });

      it('should not update any characteristic when BmsStatus message is received with undefined status', async () => {
        const message: MqttBatteryQuotaMessageWithParams<BmsStatus> = {
          typeCode: MqttBatteryMessageType.BMS,
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
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
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
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
          params: {
            inputWatts: 12.34,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
      });

      it(`should update charging state to true
        when InvStatus message is received with non zero inputWatts and non equal to it outputWatts`, async () => {
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
          params: {
            inputWatts: 12.34,
            outputWatts: 30.45,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
      });

      it(`should update charging state to false
        when InvStatus message is received with zero inputWatts and non equal to it outputWatts`, async () => {
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
          params: {
            inputWatts: 0,
            outputWatts: 30.45,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
      });

      it(`should update charging state to false
        when InvStatus message is received with zero inputWatts and outputWatts`, async () => {
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
          params: {
            inputWatts: 0,
            outputWatts: 0,
          },
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
      });

      it('should update AC, USB, CAR input consumptions when InvStatus message is received with inputWatts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
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
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
          params: {
            cfgAcEnabled: true,
          },
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });

      it('should update X-Boost state when InvStatus message is received with cfgAcXboost', async () => {
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
          params: {
            cfgAcXboost: true,
          },
        };

        processQuotaMessage(message);

        expect(switchXboostServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
      });

      it('should update AC output watts consumption when InvStatus message is received with outputWatts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
          params: {
            outputWatts: 45.67,
          },
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(45.67);
      });

      it('should not update any characteristic when InvStatus message is received with undefined status', async () => {
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
          params: {},
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateInputConsumption).not.toHaveBeenCalled();
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
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            carWatts: 34.12,
          },
        };

        processQuotaMessage(message);
        const actual = quota.pd;

        expect(actual).toEqual(message.params);
      });

      it('should update CAR state when PdStatus message is received with carState', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            carState: true,
          },
        };

        processQuotaMessage(message);

        expect(outletCarServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update CAR output consumption when PdStatus message is received with carWatts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            carWatts: 64.89,
          },
        };

        processQuotaMessage(message);

        expect(outletCarServiceMock.updateOutputConsumption).toHaveBeenCalledWith(64.89);
      });

      it('should update USB state when PdStatus message is received with dcOutState', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            dcOutState: true,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 usb1Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            usb1Watts: 0,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with usb1Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            usb1Watts: 1.1,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(1.1);
      });

      it('should update USB output consumption when PdStatus message is received with usb2Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            usb2Watts: 2.2,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.2);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 usb2Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            usb2Watts: 0,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with qcUsb1Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            qcUsb1Watts: 3.3,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(3.3);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 qcUsb1Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            qcUsb1Watts: 0,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with qcUsb2Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            qcUsb2Watts: 4.4,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(4.4);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 qcUsb2Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            qcUsb2Watts: 0,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with typec1Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            typec1Watts: 5.5,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(5.5);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 typec1Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            typec1Watts: 0,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with typec2Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            typec2Watts: 6.6,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(6.6);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 typec2Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            typec2Watts: 0,
          },
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with all usb-related parameters', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
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
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
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
        const message: MqttBatteryQuotaMessageWithParams<MpptStatus> = {
          typeCode: MqttBatteryMessageType.MPPT,
          params: {
            cfgAcEnabled: true,
          },
        };

        processQuotaMessage(message);
        const actual = quota.mppt;

        expect(actual).toEqual(message.params);
      });

      it('should update AC state when MpptStatus message is received with cfgAcEnabled', async () => {
        const message: MqttBatteryQuotaMessageWithParams<MpptStatus> = {
          typeCode: MqttBatteryMessageType.MPPT,
          params: {
            cfgAcEnabled: true,
          },
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });

      it('should update X-Boost state when MpptStatus message is received with cfgAcXboost', async () => {
        const message: MqttBatteryQuotaMessageWithParams<MpptStatus> = {
          typeCode: MqttBatteryMessageType.MPPT,
          params: {
            cfgAcXboost: true,
          },
        };

        processQuotaMessage(message);

        expect(switchXboostServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
      });

      it('should not update any characteristic when MpptStatus message is received with undefined status', async () => {
        const message: MqttBatteryQuotaMessageWithParams<MpptStatus> = {
          typeCode: MqttBatteryMessageType.MPPT,
          params: {},
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });
    });
  });

  describe('initializeDefaultValues', () => {
    let quota: BatteryAllQuotaData;
    beforeEach(() => {
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
        mppt: {
          cfgAcEnabled: false,
        },
      };
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: BatteryAllQuotaData = { bms_bmsStatus: {}, inv: {}, pd: {}, mppt: {} };

      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    describe('BmsStatus', () => {
      it('should update BmsStatus-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1);
        expect(outletAcServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1);
        expect(outletUsbServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1);
        expect(outletCarServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1);
      });

      it('should update BmsStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as BatteryAllQuotaData);

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
        expect(outletAcServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.1);
        expect(outletAcServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.2);
        expect(outletUsbServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.1);
        expect(outletCarServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.1);
      });

      it('should update InvStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as BatteryAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateInputConsumption).not.toHaveBeenCalled();
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
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as BatteryAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(outletUsbServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });
    });
  });
});
