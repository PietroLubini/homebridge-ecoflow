import { DeltaProUltraAccessory } from '@ecoflow/accessories/batteries/deltaproultra/deltaProUltraAccessory';
import { DeltaProUltraAllQuotaData, PdStatus } from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraHttpApiContracts';
import {
  DeltaProUltraMqttMessageAddrType,
  DeltaProUltraMqttQuotaMessageWithParams,
} from '@ecoflow/accessories/batteries/deltaproultra/interfaces/deltaProUltraMqttApiContracts';
import { OutletUsbService } from '@ecoflow/accessories/batteries/deltaproultra/services/outletUsbService';
import { SwitchXboostService } from '@ecoflow/accessories/batteries/deltaproultra/services/switchXboostService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
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
jest.mock('@ecoflow/accessories/batteries/deltaproultra/services/outletUsbService');
jest.mock('@ecoflow/accessories/batteries/deltaproultra/services/switchXboostService');
jest.mock('@ecoflow/services/accessoryInformationService');

describe('DeltaProUltraAccessory', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;
  let accessory: DeltaProUltraAccessory;
  let batteryStatusServiceMock: jest.Mocked<BatteryStatusService>;
  let outletUsbServiceMock: jest.Mocked<OutletUsbService>;
  let outletAcServiceMock: jest.Mocked<OutletReadOnlyService>;
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
      Name: 'OutletReadOnlyService',
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
    outletUsbServiceMock = initOutletService(OutletUsbService, new OutletUsbService(accessory, batteryStatusProviderMock));
    outletAcServiceMock = initOutletService(OutletReadOnlyService, new OutletReadOnlyService(accessory, batteryStatusProviderMock, 'AC'));
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
    accessory = new DeltaProUltraAccessory(
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
      expect(switchXboostServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('processQuotaMessage', () => {
    let quota: DeltaProUltraAllQuotaData;

    beforeEach(() => {
      quota = {} as DeltaProUltraAllQuotaData;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnStatusTopic.mockResolvedValue(true);
    });

    describe('PdStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.hs_yj751_pd_appshow_addr = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should update pd status in quota when PdStatus message is received', async () => {
        const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
          addr: DeltaProUltraMqttMessageAddrType.PD,
          param: {
            soc: 34.67,
          },
        };

        processQuotaMessage(message);
        const actual = quota.hs_yj751_pd_appshow_addr;

        expect(actual).toEqual(message.param);
      });

      it('should not update any characteristic when PdStatus message is received with undefined status', async () => {
        const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
          addr: DeltaProUltraMqttMessageAddrType.PD,
          param: {},
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletAcServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletUsbServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });

      describe('BatteryLevel', () => {
        it('should update battery level when PdStatus message is received with soc', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              soc: 34.67,
            },
          };

          processQuotaMessage(message);

          expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 0);
          expect(outletAcServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 0);
          expect(outletUsbServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 0);
        });

        it('should not update any characteristic when PdStatus message is received with undefined status', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {},
          };

          processQuotaMessage(message);

          expect(batteryStatusServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(outletAcServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(outletUsbServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        });
      });

      describe('ChargingState', () => {
        it(`should update charging state to true
          when PdStatus message is received with non zero wattsInSum and without wattsOutSum`, async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              wattsInSum: 12.34,
            },
          };

          processQuotaMessage(message);

          expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
          expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(true);
          expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        });

        it(`should update charging state to true
          when PdStatus message is received with non zero wattsInSum and non equal to it wattsOutSum`, async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              wattsInSum: 12.34,
              wattsOutSum: 30.45,
            },
          };

          processQuotaMessage(message);

          expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
          expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(true);
          expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        });

        it(`should update charging state to false
          when PdStatus message is received with zero wattsInSum and non equal to it wattsOutSum`, async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              wattsInSum: 0,
              wattsOutSum: 30.45,
            },
          };

          processQuotaMessage(message);

          expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
          expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(false);
          expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        });

        it(`should update charging state to false
          when PdStatus message is received with zero wattsInSum and wattsOutSum`, async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              wattsInSum: 0,
              wattsOutSum: 0,
            },
          };

          processQuotaMessage(message);

          expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
          expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(false);
          expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        });

        it('should update AC, USB input consumptions when PdStatus message is received with wattsInSum', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              wattsInSum: 12.34,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
          expect(outletUsbServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
        });
      });

      describe('AC', () => {
        // it('should update AC state when InvStatus message is received with cfgAcEnabled', async () => {
        //   const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
        //     param: {
        //       hs_yj751_pd_appshow_addr: {
        //         acOutState: AcEnableType.On,
        //       },
        //     },
        //   };
        //   processQuotaMessage(message);
        //   expect(outletAcServiceMock.updateState).toHaveBeenCalledWith(true);
        // });

        it('should update AC output consumption when PdStatus message is received with outAcL11Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcL11Pwr: 1.1,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(1.1);
        });

        it('should update AC output consumption with 0 when PdStatus message received with 0 outAcL11Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcL11Pwr: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update AC output consumption when PdStatus message is received with outAcL12Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcL12Pwr: 2.2,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.2);
        });

        it('should update AC output consumption with 0 when PdStatus message received with 0 outAcL12Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcL12Pwr: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update AC output consumption when PdStatus message is received with outAcL21Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcL21Pwr: 3.3,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(3.3);
        });

        it('should update AC output consumption with 0 when PdStatus message received with 0 outAcL21Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcL21Pwr: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update AC output consumption when PdStatus message is received with outAcL22Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcL22Pwr: 4.4,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(4.4);
        });

        it('should update AC output consumption with 0 when PdStatus message received with 0 outAcL22Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcL22Pwr: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update AC output consumption when PdStatus message is received with outAcTtPwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcTtPwr: 5.5,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(5.5);
        });

        it('should update AC output consumption with 0 when PdStatus message received with 0 outAcTtPwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcTtPwr: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update AC output consumption when PdStatus message is received with outAcL14Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcL14Pwr: 6.6,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(6.6);
        });

        it('should update AC output consumption with 0 when PdStatus message received with 0 outAcL14Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcL14Pwr: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update AC output consumption when PdStatus message is received with outAc5p8Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAc5p8Pwr: 7.7,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(7.7);
        });

        it('should update AC output consumption with 0 when PdStatus message received with 0 outAc5p8Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAc5p8Pwr: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update AC output consumption when PdStatus message is received with all ac-related parameters', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outAcL11Pwr: 1.1,
              outAcL12Pwr: 2.2,
              outAcL21Pwr: 3.3,
              outAcL22Pwr: 4.4,
              outAcTtPwr: 5.5,
              outAcL14Pwr: 6.6,
              outAc5p8Pwr: 7.7,
            },
          };

          processQuotaMessage(message);

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(30.8);
        });
      });

      describe('USB', () => {
        // it('should update USB state when PdStatus message is received with dcOutState', async () => {
        //   const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
        //     param: {
        //       hs_yj751_pd_appshow_addr: {
        //         dcOutState: EnableType.On,
        //       },
        //     },
        //   };
        //   processQuotaMessage(message);
        //   expect(outletUsbServiceMock.updateState).toHaveBeenCalledWith(true);
        // });

        it('should update USB output consumption when PdStatus message is received with outUsb1Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outUsb1Pwr: 1.1,
            },
          };

          processQuotaMessage(message);

          expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(1.1);
        });

        it('should update USB output consumption with 0 when PdStatus message received with 0 outUsb1Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outUsb1Pwr: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update USB output consumption when PdStatus message is received with outUsb2Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outUsb2Pwr: 2.2,
            },
          };

          processQuotaMessage(message);

          expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.2);
        });

        it('should update USB output consumption with 0 when PdStatus message received with 0 outUsb2Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outUsb2Pwr: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update USB output consumption when PdStatus message is received with outTypec1Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outTypec1Pwr: 3.3,
            },
          };

          processQuotaMessage(message);

          expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(3.3);
        });

        it('should update USB output consumption with 0 when PdStatus message received with 0 outTypec1Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outTypec1Pwr: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update USB output consumption when PdStatus message is received with outTypec2Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outTypec2Pwr: 4.4,
            },
          };

          processQuotaMessage(message);

          expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(4.4);
        });

        it('should update USB output consumption with 0 when PdStatus message received with 0 outTypec2Pwr', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outTypec2Pwr: 0,
            },
          };

          processQuotaMessage(message);

          expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(0);
        });

        it('should update USB output consumption when PdStatus message is received with all usb-related parameters', async () => {
          const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
            addr: DeltaProUltraMqttMessageAddrType.PD,
            param: {
              outUsb1Pwr: 1.1,
              outUsb2Pwr: 2.2,
              outTypec1Pwr: 3.3,
              outTypec2Pwr: 4.5,
            },
          };

          processQuotaMessage(message);

          expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(11.1);
        });
      });
    });

    describe('PdSetStatus', () => {
      let processQuotaMessage: (value: MqttQuotaMessage) => void;
      beforeEach(async () => {
        quota.hs_yj751_pd_app_set_info_addr = {};
        await accessory.initialize();
        await accessory.initializeDefaultValues(false);
        processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
      });

      it('should not update any characteristic when PdSetStatus message is received with undefined status', async () => {
        const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
          addr: DeltaProUltraMqttMessageAddrType.PD,
          param: {},
        };

        processQuotaMessage(message);

        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });

      // it('should update X-Boost state when PdSetStatus message is received with cfgAcXboost', async () => {
      //   const message: DeltaProUltraMqttQuotaMessageWithParams<PdStatus> = {
      //     param: {
      //       inv: {
      //         acXboost: AcXBoostType.On,
      //       },
      //     },
      //   };

      //   processQuotaMessage(message);

      //   expect(switchXboostServiceMock.updateState).toHaveBeenCalledWith(true);
      // });
    });
  });

  describe('initializeDefaultValues', () => {
    let quota: DeltaProUltraAllQuotaData;
    beforeEach(() => {
      quota = {
        hs_yj751_pd_appshow_addr: {
          soc: 1.1,
          wattsInSum: 2.1,
          wattsOutSum: 2.2,
          // acOutState: EnableType.On,
          outAcL21Pwr: 3.3,
          outUsb2Pwr: 4.4,
          // dcOutState: EnableType.Off,
        },
        hs_yj751_pd_app_set_info_addr: {
          // acXboost: AcXBoostType.Off,
        },
      };
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: DeltaProUltraAllQuotaData = { hs_yj751_pd_appshow_addr: {}, hs_yj751_pd_app_set_info_addr: {} };

      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    describe('PdStatus', () => {
      describe('BatteryLevel', () => {
        it('should update BatteryLevel-related characteristics when is requested', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

          await accessory.initializeDefaultValues();

          expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 0);
          expect(outletAcServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 0);
          expect(outletUsbServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 0);
        });

        it('should update BatteryLevel-related characteristics when is requested and quotas were not initialized properly for it', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as DeltaProUltraAllQuotaData);

          await accessory.initializeDefaultValues();

          expect(batteryStatusServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(outletAcServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
          expect(outletUsbServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        });
      });

      describe('ChargingState', () => {
        it('should update ChargingState-related characteristics when is requested', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

          await accessory.initializeDefaultValues();

          expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
          expect(outletAcServiceMock.updateChargingState).toHaveBeenCalledWith(true);
          expect(outletUsbServiceMock.updateChargingState).toHaveBeenCalledWith(true);
          expect(outletAcServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.1);
          expect(outletUsbServiceMock.updateInputConsumption).toHaveBeenCalledWith(2.1);
        });

        it('should not update ChargingState-related characteristics when is requested and quotas were not initialized properly for it', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as DeltaProUltraAllQuotaData);

          await accessory.initializeDefaultValues();

          expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
          expect(outletAcServiceMock.updateChargingState).not.toHaveBeenCalled();
          expect(outletUsbServiceMock.updateChargingState).not.toHaveBeenCalled();
          expect(outletAcServiceMock.updateInputConsumption).not.toHaveBeenCalled();
          expect(outletUsbServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        });
      });

      describe('AC', () => {
        it('should update AC-related characteristics when is requested', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

          await accessory.initializeDefaultValues();

          expect(outletAcServiceMock.updateOutputConsumption).toHaveBeenCalledWith(3.3);
        });

        it('should not update AC-related characteristics when is requested and quotas were not initialized properly for it', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as DeltaProUltraAllQuotaData);

          await accessory.initializeDefaultValues();

          expect(outletAcServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        });
      });

      describe('USB', () => {
        it('should update USB-related characteristics when is requested', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

          await accessory.initializeDefaultValues();

          expect(outletUsbServiceMock.updateOutputConsumption).toHaveBeenCalledWith(4.4);
        });

        it('should not update USB-related characteristics when is requested and quotas were not initialized properly for it', async () => {
          httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as DeltaProUltraAllQuotaData);

          await accessory.initializeDefaultValues();

          expect(outletUsbServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        });
      });
    });

    describe('PdSetStatus', () => {
      // it('should update PdSetStatus-related characteristics when is requested', async () => {
      //   httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

      //   await accessory.initializeDefaultValues();

      //   expect(switchXboostServiceMock.updateState).toHaveBeenCalledWith(false);
      // });

      it('should update PdSetStatus-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as DeltaProUltraAllQuotaData);

        await accessory.initializeDefaultValues();

        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });
    });
  });
});
