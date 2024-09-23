import { BatteryAccessoryBase } from '@ecoflow/accessories/batteries/batteryAccessoryBase';
import {
  BatteryAllQuotaData,
  BmsStatus,
  InvStatus,
  PdStatus,
} from '@ecoflow/accessories/batteries/interfaces/httpApiBatteryContracts';
import {
  MqttBatteryMessageType,
  MqttBatteryQuotaMessageWithParams,
} from '@ecoflow/accessories/batteries/interfaces/mqttApiBatteryContracts';
import { OutletAcService } from '@ecoflow/accessories/batteries/services/outletAcService';
import { OutletCarService } from '@ecoflow/accessories/batteries/services/outletCarService';
import { OutletUsbService } from '@ecoflow/accessories/batteries/services/outletUsbService';
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
      Name: 'AccessoryInformationService',
    },
  ];

  beforeEach(() => {
    function createService<TService extends ServiceBase, TModule extends ServiceBase>(
      Service: new (ecoFlowAccessory: MockAccessory) => TService,
      Module: new (ecoFlowAccessory: MockAccessory) => TModule,
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
      Service: new (ecoFlowAccessory: MockAccessory) => TService,
      Module: new (ecoFlowAccessory: MockAccessory) => TModule
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
    });
    outletUsbServiceMock = createOutletService(OutletUsbService, OutletUsbService);
    outletAcServiceMock = createOutletService(OutletAcService, OutletAcService);
    outletCarServiceMock = createOutletService(OutletCarService, OutletCarService);
    accessoryInformationServiceMock = createService(AccessoryInformationService, AccessoryInformationService);

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
    accessory = new MockAccessory(platformMock, accessoryMock, config, logMock, httpApiManagerMock, mqttApiManagerMock);
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
        quota.bms_bmsStatus = {} as BmsStatus;
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
          params: {} as BmsStatus,
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
        quota.inv = {} as InvStatus;
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

      it('should update AC, USB, CAR input consumptions when InvStatus message is received with inputWatts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
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
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
          params: {
            cfgAcEnabled: true,
          } as InvStatus,
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update AC output watts consumption when InvStatus message is received with outputWatts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
          params: {
            outputWatts: 45.67,
          } as InvStatus,
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(45.67);
      });

      it('should not update any characteristic when InvStatus message is received with undefined status', async () => {
        const message: MqttBatteryQuotaMessageWithParams<InvStatus> = {
          typeCode: MqttBatteryMessageType.INV,
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
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletCarServiceMock.updateOutputConsumption).toHaveBeenCalledWith(64.89);
      });

      it('should update USB state when PdStatus message is received with dcOutState', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            dcOutState: true,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 usb1Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            usb1Watts: 0,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with usb1Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            usb1Watts: 1.1,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(1.1);
      });

      it('should update USB output consumption when PdStatus message is received with usb2Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            usb2Watts: 2.2,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.2);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 usb2Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            usb2Watts: 0,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with qcUsb1Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            qcUsb1Watts: 3.3,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(3.3);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 qcUsb1Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            qcUsb1Watts: 0,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with qcUsb2Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            qcUsb2Watts: 4.4,
          } as PdStatus,
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
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(5.5);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 typec1Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            typec1Watts: 0,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with typec2Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            typec2Watts: 6.6,
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(6.6);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 typec2Watts', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
          params: {
            typec2Watts: 0,
          } as PdStatus,
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
          } as PdStatus,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(23.1);
      });

      it('should not update any characteristic when PdStatus message is received with undefined status', async () => {
        const message: MqttBatteryQuotaMessageWithParams<PdStatus> = {
          typeCode: MqttBatteryMessageType.PD,
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
      };
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: BatteryAllQuotaData = { bms_bmsStatus: {}, inv: {}, pd: {} };

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

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(2.1);
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
