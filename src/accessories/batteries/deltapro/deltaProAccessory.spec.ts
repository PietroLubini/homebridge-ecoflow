import { DeltaProAccessory } from '@ecoflow/accessories/batteries/deltapro/deltaProAccessory';
import { DeltaProAllQuotaData } from '@ecoflow/accessories/batteries/deltapro/interfaces/deltaProHttpApiContracts';
import { DeltaProMqttQuotaMessageWithParams } from '@ecoflow/accessories/batteries/deltapro/interfaces/deltaProMqttApiContracts';
import { OutletAcService } from '@ecoflow/accessories/batteries/deltapro/services/outletAcService';
import { OutletCarService } from '@ecoflow/accessories/batteries/deltapro/services/outletCarService';
import { SwitchXboostService } from '@ecoflow/accessories/batteries/deltapro/services/switchXboostService';
import { AcEnableType, AcXBoostType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
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
import { OutletReadOnlyService } from '@ecoflow/services/outletReadOnlyService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

jest.mock('@ecoflow/services/batteryStatusService');
jest.mock('@ecoflow/services/outletReadOnlyService');
jest.mock('@ecoflow/accessories/batteries/deltapro/services/outletAcService');
jest.mock('@ecoflow/accessories/batteries/deltapro/services/outletCarService');
jest.mock('@ecoflow/accessories/batteries/deltapro/services/switchXboostService');
jest.mock('@ecoflow/services/accessoryInformationService');

describe('DeltaProAccessory', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;
  let accessory: DeltaProAccessory;
  let batteryStatusServiceMock: jest.Mocked<BatteryStatusService>;
  let outletUsbServiceMock: jest.Mocked<OutletReadOnlyService>;
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
      Name: 'OutletReadOnlyService',
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

    function initOutletService<TService extends OutletBatteryServiceBase>(Module: object, service: TService): jest.Mocked<TService> {
      return initService(Module, service, mock => {
        const mockOutletBase = mock as jest.Mocked<OutletBatteryServiceBase>;
        mockOutletBase.updateBatteryLevel.mockReset();
        mockOutletBase.updateChargingState.mockReset();
        mockOutletBase.updateInputConsumption.mockReset();
        mockOutletBase.updateOutputConsumption.mockReset();
        mockOutletBase.updateState.mockReset();
      });
    }

    batteryStatusProviderMock = {} as jest.Mocked<BatteryStatusProvider>;
    batteryStatusServiceMock = initService(BatteryStatusService, new BatteryStatusService(accessory, batteryStatusProviderMock), mock => {
      mock.updateBatteryLevel.mockReset();
      mock.updateChargingState.mockReset();
    });
    outletUsbServiceMock = initOutletService(OutletReadOnlyService, new OutletReadOnlyService(accessory, batteryStatusProviderMock, 'USB'));
    outletAcServiceMock = initOutletService(OutletAcService, new OutletAcService(accessory, batteryStatusProviderMock));
    outletCarServiceMock = initOutletService(OutletCarService, new OutletCarService(accessory, batteryStatusProviderMock));
    accessoryInformationServiceMock = initService(AccessoryInformationService, new AccessoryInformationService(accessory));
    switchXboostServiceMock = initService(SwitchXboostService, new SwitchXboostService(accessory), mock => {
      mock.updateState.mockReset();
    });

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
    accessory = new DeltaProAccessory(
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
      expect(batteryStatusServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(outletUsbServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(outletAcServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(outletCarServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(switchXboostServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('processQuotaMessage', () => {
    let quota: DeltaProAllQuotaData;

    beforeEach(() => {
      quota = {} as DeltaProAllQuotaData;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);
    });

    describe('BmsMasterStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.ems = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update bms status in quota when BmsStatus message is received', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            ems: {
              f32LcdShowSoc: 34.67,
              minDsgSoc: 31.2,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);
        const actual = quota.ems;

        expect(actual).toEqual(message.data.ems);
      });

      it('should update battery level when BmsStatus message is received with f32ShowSoc', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            ems: {
              f32LcdShowSoc: 34.67,
              minDsgSoc: 31.2,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 31.2);
        expect(outletAcServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 31.2);
        expect(outletUsbServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 31.2);
        expect(outletCarServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 31.2);
      });

      it('should not update any characteristic when BmsStatus message is received with undefined status', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {} as DeltaProAllQuotaData,
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
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            inv: {
              inputWatts: 12.34,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);
        const actual = quota.inv;

        expect(actual).toEqual(message.data.inv);
      });

      it(`should update charging state to true
        when InvStatus message is received with non zero inputWatts and without outputWatts`, async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            inv: {
              inputWatts: 12.34,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletCarServiceMock.updateChargingState).toHaveBeenCalledWith(true);
      });

      it(`should update charging state to true
        when InvStatus message is received with non zero inputWatts and non equal to it outputWatts`, async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            inv: {
              inputWatts: 12.34,
              outputWatts: 30.45,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletCarServiceMock.updateChargingState).toHaveBeenCalledWith(true);
      });

      it(`should update charging state to false
        when InvStatus message is received with zero inputWatts and non equal to it outputWatts`, async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            inv: {
              inputWatts: 0,
              outputWatts: 30.45,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletCarServiceMock.updateChargingState).toHaveBeenCalledWith(false);
      });

      it(`should update charging state to false
        when InvStatus message is received with zero inputWatts and outputWatts`, async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            inv: {
              inputWatts: 0,
              outputWatts: 0,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletCarServiceMock.updateChargingState).toHaveBeenCalledWith(false);
      });

      it('should update AC, USB, CAR input consumptions when InvStatus message is received with inputWatts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            inv: {
              inputWatts: 12.34,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
        expect(outletUsbServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
        expect(outletCarServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
      });

      it('should update AC state when InvStatus message is received with cfgAcEnabled', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            inv: {
              cfgAcEnabled: AcEnableType.On,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });

      it('should update X-Boost state when InvStatus message is received with cfgAcXboost', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            inv: {
              cfgAcXboost: AcXBoostType.On,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(switchXboostServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
      });

      it('should update AC output watts consumption when InvStatus message is received with outputWatts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            inv: {
              outputWatts: 45.67,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(45.67);
      });

      it('should not update any characteristic when InvStatus message is received with undefined status', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: { inv: {} } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateInputConsumption).not.toHaveBeenCalled();
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
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              carWatts: 34.12,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);
        const actual = quota.pd;

        expect(actual).toEqual(message.data.pd);
      });

      it('should update CAR state when PdStatus message is received with carState', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              carState: EnableType.On,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletCarServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update CAR output consumption when PdStatus message is received with carWatts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              carWatts: 64.89,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletCarServiceMock.updateOutputConsumption).toHaveBeenCalledWith(64.89);
      });

      it('should update USB state when PdStatus message is received with dcOutState', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              dcOutState: EnableType.On,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 usb1Watts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              usb1Watts: 0,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with usb1Watts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              usb1Watts: 1.1,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(1.1);
      });

      it('should update USB output consumption when PdStatus message is received with usb2Watts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              usb2Watts: 2.2,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.2);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 usb2Watts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              usb2Watts: 0,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with qcUsb1Watts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              qcUsb1Watts: 3.3,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(3.3);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 qcUsb1Watts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              qcUsb1Watts: 0,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with qcUsb2Watts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              qcUsb2Watts: 4.4,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(4.4);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 qcUsb2Watts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              qcUsb2Watts: 0,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with typec1Watts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              typec1Watts: 5.5,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(5.5);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 typec1Watts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              typec1Watts: 0,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with typec2Watts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              typec2Watts: 6.6,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(6.6);
      });

      it('should update USB output consumption with 0 when PdStatus message received with 0 typec2Watts', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              typec2Watts: 0,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
      });

      it('should update USB output consumption when PdStatus message is received with all usb-related parameters', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {
            pd: {
              usb1Watts: 1.1,
              usb2Watts: 2.2,
              qcUsb1Watts: 3.3,
              qcUsb2Watts: 4.4,
              typec1Watts: 5.5,
              typec2Watts: 6.6,
            },
          } as DeltaProAllQuotaData,
        };

        processQuotaMessage(message);

        expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(23.1);
      });

      it('should not update any characteristic when PdStatus message is received with undefined status', async () => {
        const message: DeltaProMqttQuotaMessageWithParams<DeltaProAllQuotaData> = {
          data: {} as DeltaProAllQuotaData,
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
    let quota: DeltaProAllQuotaData;
    beforeEach(() => {
      quota = {
        ems: {
          f32LcdShowSoc: 1.1,
          minDsgSoc: 1.9,
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
      };
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: DeltaProAllQuotaData = { ems: {}, inv: {}, pd: {} };

      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    describe('EmsStatus', () => {
      it('should update BmsStatus-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 1.9);
        expect(outletAcServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 1.9);
        expect(outletUsbServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 1.9);
        expect(outletCarServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 1.9);
      });

      it('should update BmsStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as DeltaProAllQuotaData);

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
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as DeltaProAllQuotaData);

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
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as DeltaProAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(outletUsbServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletCarServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });
    });
  });
});
