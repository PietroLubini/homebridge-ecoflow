import { DeltaPro3Accessory } from '@ecoflow/accessories/batteries/deltapro3/deltaPro3Accessory';
import {
  DeltaPro3AcEnableType,
  DeltaPro3AllQuotaData,
} from '@ecoflow/accessories/batteries/deltapro3/interfaces/deltaPro3HttpApiContracts';
import { OutletAcHvService } from '@ecoflow/accessories/batteries/deltapro3/services/outletAcHvService';
import { OutletAcLvService } from '@ecoflow/accessories/batteries/deltapro3/services/outletAcLvService';
import { OutletDc12vService } from '@ecoflow/accessories/batteries/deltapro3/services/outletDc12vService';
import { SwitchXboostService } from '@ecoflow/accessories/batteries/deltapro3/services/switchXboostService';
import { AcXBoostType } from '@ecoflow/accessories/batteries/interfaces/batteryHttpApiContracts';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig } from '@ecoflow/config';
import { BatteryStatusProvider } from '@ecoflow/helpers/batteryStatusProvider';
import { getActualServices, MockService } from '@ecoflow/helpers/tests/accessoryTestHelper';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { AccessoryInformationService } from '@ecoflow/services/accessoryInformationService';
import { BatteryOutletServiceBase } from '@ecoflow/services/batteryOutletServiceBase';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

jest.mock('@ecoflow/services/batteryStatusService');
jest.mock('@ecoflow/accessories/batteries/deltapro3/services/outletAcHvService');
jest.mock('@ecoflow/accessories/batteries/deltapro3/services/outletAcLvService');
jest.mock('@ecoflow/accessories/batteries/deltapro3/services/outletDc12vService');
jest.mock('@ecoflow/accessories/batteries/deltapro3/services/switchXboostService');
jest.mock('@ecoflow/services/accessoryInformationService');

describe('DeltaPro3Accessory', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;
  let accessory: DeltaPro3Accessory;
  let batteryStatusServiceMock: jest.Mocked<BatteryStatusService>;
  let outletAcHvServiceMock: jest.Mocked<OutletAcHvService>;
  let outletAcLvServiceMock: jest.Mocked<OutletAcLvService>;
  let outletDc12vServiceMock: jest.Mocked<OutletDc12vService>;
  let switchXboostServiceMock: jest.Mocked<SwitchXboostService>;
  let batteryStatusProviderMock: jest.Mocked<BatteryStatusProvider>;
  let accessoryInformationServiceMock: jest.Mocked<AccessoryInformationService>;
  const expectedServices: MockService[] = [
    {
      Name: 'BatteryStatusService',
    },
    {
      Name: 'OutletAcHvService',
    },
    {
      Name: 'OutletAcLvService',
    },
    {
      Name: 'OutletDc12vService',
    },
    // {
    //   Name: 'SwitchXboostService',
    // },
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

    function initOutletService<TService extends BatteryOutletServiceBase>(
      Module: object,
      service: TService
    ): jest.Mocked<TService> {
      return initService(Module, service, mock => {
        const mockOutletBase = mock as jest.Mocked<BatteryOutletServiceBase>;
        mockOutletBase.updateBatteryLevel.mockReset();
        mockOutletBase.updateChargingState.mockReset();
        mockOutletBase.updateInputConsumption.mockReset();
        mockOutletBase.updateOutputConsumption.mockReset();
        mockOutletBase.updateState.mockReset();
      });
    }

    batteryStatusProviderMock = {} as jest.Mocked<BatteryStatusProvider>;
    batteryStatusServiceMock = initService(
      BatteryStatusService,
      new BatteryStatusService(accessory, batteryStatusProviderMock),
      mock => {
        mock.updateBatteryLevel.mockReset();
        mock.updateChargingState.mockReset();
      }
    );
    outletAcHvServiceMock = initOutletService(
      OutletAcHvService,
      new OutletAcHvService(accessory, batteryStatusProviderMock)
    );
    outletAcLvServiceMock = initOutletService(
      OutletAcLvService,
      new OutletAcLvService(accessory, batteryStatusProviderMock)
    );
    outletDc12vServiceMock = initOutletService(
      OutletDc12vService,
      new OutletDc12vService(accessory, batteryStatusProviderMock)
    );
    accessoryInformationServiceMock = initService(
      AccessoryInformationService,
      new AccessoryInformationService(accessory)
    );
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
      subscribeOnQuotaMessage: jest.fn(),
      subscribeOnSetReplyMessage: jest.fn(),
      sendSetCommand: jest.fn(),
    } as unknown as jest.Mocked<EcoFlowMqttApiManager>;
    config = { secretKey: 'secretKey1', accessKey: 'accessKey1', serialNumber: 'sn1' } as unknown as DeviceConfig;
    accessory = new DeltaPro3Accessory(
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
      expect(outletAcHvServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(outletAcLvServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(outletDc12vServiceMock.initialize).toHaveBeenCalledTimes(1);
      // expect(switchXboostServiceMock.initialize).toHaveBeenCalledTimes(1);
      expect(accessoryInformationServiceMock.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('processQuotaMessage', () => {
    let quota: DeltaPro3AllQuotaData;
    let processQuotaMessage: (value: MqttQuotaMessage) => void;

    beforeEach(async () => {
      quota = {} as DeltaPro3AllQuotaData;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);
      mqttApiManagerMock.subscribeOnQuotaTopic.mockResolvedValue(true);
      mqttApiManagerMock.subscribeOnSetReplyTopic.mockResolvedValue(true);
      await accessory.initialize();
      await accessory.initializeDefaultValues(false);
      processQuotaMessage = mqttApiManagerMock.subscribeOnQuotaMessage.mock.calls[0][1]!;
    });

    describe('updateSocValues', () => {
      it('should update soc values in quota when received message contains them', async () => {
        const message: DeltaPro3AllQuotaData = {
          cmsBattSoc: 34.67,
          cmsMinDsgSoc: 31.2,
        };

        processQuotaMessage(message);
        const actual = quota;

        expect(actual).toEqual(message);
      });

      it('should update battery level when message is received with cmsBattSoc', async () => {
        const message: DeltaPro3AllQuotaData = {
          cmsBattSoc: 34.67,
          cmsMinDsgSoc: 31.2,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 31.2);
        expect(outletAcHvServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 31.2);
        expect(outletAcLvServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 31.2);
        expect(outletDc12vServiceMock.updateBatteryLevel).toHaveBeenCalledWith(34.67, 31.2);
      });

      it('should not update any characteristic when message is received with undefined status', async () => {
        const message: DeltaPro3AllQuotaData = {};

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletAcHvServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletAcLvServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletDc12vServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
      });
    });

    describe('updateInputWattsValues', () => {
      it('should update input watts in quota when received message contains it', async () => {
        const message: DeltaPro3AllQuotaData = {
          inputWatts: 12.34,
        };

        processQuotaMessage(message);
        const actual = quota;

        expect(actual).toEqual(message);
      });

      it(`should update charging state to true
        when message is received with non zero inputWatts and without outputWatts`, async () => {
        const message: DeltaPro3AllQuotaData = {
          inputWatts: 12.34,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcHvServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcLvServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletDc12vServiceMock.updateChargingState).toHaveBeenCalledWith(true);
      });

      it(`should update charging state to true
        when message is received with non zero inputWatts and non equal to it outputWatts`, async () => {
        const message: DeltaPro3AllQuotaData = {
          inputWatts: 12.34,
          outputWatts: 30.45,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcHvServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcLvServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletDc12vServiceMock.updateChargingState).toHaveBeenCalledWith(true);
      });

      it(`should update charging state to false
        when message is received with zero inputWatts and non equal to it outputWatts`, async () => {
        const message: DeltaPro3AllQuotaData = {
          inputWatts: 0,
          outputWatts: 30.45,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletAcHvServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletAcLvServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletDc12vServiceMock.updateChargingState).toHaveBeenCalledWith(false);
      });

      it(`should update charging state to false
        when message is received with zero inputWatts and outputWatts`, async () => {
        const message: DeltaPro3AllQuotaData = {
          inputWatts: 0,
          outputWatts: 0,
        };

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletAcHvServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletAcLvServiceMock.updateChargingState).toHaveBeenCalledWith(false);
        expect(outletDc12vServiceMock.updateChargingState).toHaveBeenCalledWith(false);
      });

      it('should update AC HV, AC LV, DC 12V input consumptions when message is received with inputWatts', async () => {
        const message: DeltaPro3AllQuotaData = {
          inputWatts: 12.34,
        };

        processQuotaMessage(message);

        expect(outletAcHvServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
        expect(outletAcLvServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
        expect(outletDc12vServiceMock.updateInputConsumption).toHaveBeenCalledWith(12.34);
      });

      it('should not update any characteristic when message is received with undefined status', async () => {
        const message: DeltaPro3AllQuotaData = {};

        processQuotaMessage(message);

        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcHvServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcLvServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletDc12vServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcHvServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletAcLvServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletDc12vServiceMock.updateInputConsumption).not.toHaveBeenCalled();
      });
    });

    describe('updateOutputWattsValues', () => {
      it('should update AC HV output watts consumption when message is received with powGetAcHvOut', async () => {
        const message: DeltaPro3AllQuotaData = {
          powGetAcHvOut: -45.67,
        };

        processQuotaMessage(message);

        expect(outletAcHvServiceMock.updateOutputConsumption).toHaveBeenCalledWith(45.67);
      });

      it('should update AC LV output consumption when message is received with powGetAcLvOut', async () => {
        const message: DeltaPro3AllQuotaData = {
          powGetAcLvOut: -64.89,
        };

        processQuotaMessage(message);

        expect(outletAcLvServiceMock.updateOutputConsumption).toHaveBeenCalledWith(64.89);
      });

      it('should update DC 12V output consumption when message is received with powGet12v', async () => {
        const message: DeltaPro3AllQuotaData = {
          powGet12v: -56.78,
        };

        processQuotaMessage(message);

        expect(outletDc12vServiceMock.updateOutputConsumption).toHaveBeenCalledWith(56.78);
      });

      it('should not update any characteristic when message is received with undefined status', async () => {
        const message: DeltaPro3AllQuotaData = {};

        processQuotaMessage(message);

        expect(outletAcHvServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletAcLvServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletDc12vServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });
    });

    describe('updateSwitchStateValues', () => {
      it('should update AC HV state when message is received with flowInfoAcHvOut', async () => {
        const message: DeltaPro3AllQuotaData = {
          flowInfoAcHvOut: DeltaPro3AcEnableType.On,
        };

        processQuotaMessage(message);

        expect(outletAcHvServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update AC LV state when message is received with flowInfoAcLvOut', async () => {
        const message: DeltaPro3AllQuotaData = {
          flowInfoAcLvOut: DeltaPro3AcEnableType.On,
        };

        processQuotaMessage(message);

        expect(outletAcLvServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      it('should update DC 12V state when message is received with flowInfo12v', async () => {
        const message: DeltaPro3AllQuotaData = {
          flowInfo12v: DeltaPro3AcEnableType.On,
        };

        processQuotaMessage(message);

        expect(outletDc12vServiceMock.updateState).toHaveBeenCalledWith(true);
      });

      // it('should update X-Boost state when message is received with xboostEn', async () => {
      //   const message: DeltaPro3AllQuotaData = {
      //     xboostEn: AcXBoostType.On,
      //   };

      //   processQuotaMessage(message);

      //   expect(switchXboostServiceMock.updateState).toHaveBeenCalledWith(true);
      // });

      it('should not update any characteristic when message is received with undefined status', async () => {
        const message: DeltaPro3AllQuotaData = {};

        processQuotaMessage(message);

        expect(outletAcHvServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletAcLvServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletDc12vServiceMock.updateState).not.toHaveBeenCalled();
        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });
    });
  });

  describe('initializeDefaultValues', () => {
    let quota: DeltaPro3AllQuotaData;
    beforeEach(() => {
      quota = {
        cmsBattSoc: 1.1,
        cmsMinDsgSoc: 1.9,
        flowInfo12v: DeltaPro3AcEnableType.Off,
        flowInfoAcHvOut: DeltaPro3AcEnableType.On,
        flowInfoAcLvOut: DeltaPro3AcEnableType.Off,
        powGet12v: -2.1,
        powGetAcHvOut: -2.2,
        powGetAcLvOut: -2.3,
        inputWatts: 3.1,
        outputWatts: 3.2,
        xboostEn: AcXBoostType.Off,
      };
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: DeltaPro3AllQuotaData = {};

      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    describe('updateSocValues', () => {
      it('should update soc-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 1.9);
        expect(outletAcHvServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 1.9);
        expect(outletAcHvServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 1.9);
        expect(outletDc12vServiceMock.updateBatteryLevel).toHaveBeenCalledWith(1.1, 1.9);
      });

      it('should not update soc-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as DeltaPro3AllQuotaData);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletAcHvServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletAcHvServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
        expect(outletDc12vServiceMock.updateBatteryLevel).not.toHaveBeenCalled();
      });
    });

    describe('updateInputWattsValues', () => {
      it('should update input watts-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcHvServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcHvServiceMock.updateInputConsumption).toHaveBeenCalledWith(3.1);
        expect(outletAcLvServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletAcLvServiceMock.updateInputConsumption).toHaveBeenCalledWith(3.1);
        expect(outletDc12vServiceMock.updateChargingState).toHaveBeenCalledWith(true);
        expect(outletDc12vServiceMock.updateInputConsumption).toHaveBeenCalledWith(3.1);
      });

      it('should update input watts-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as DeltaPro3AllQuotaData);

        await accessory.initializeDefaultValues();

        expect(batteryStatusServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcHvServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcHvServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletAcLvServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletAcLvServiceMock.updateInputConsumption).not.toHaveBeenCalled();
        expect(outletDc12vServiceMock.updateChargingState).not.toHaveBeenCalled();
        expect(outletDc12vServiceMock.updateInputConsumption).not.toHaveBeenCalled();
      });
    });

    describe('updateOutputWattsValues', () => {
      it('should update output watts-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(outletAcHvServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.2);
        expect(outletAcLvServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.3);
        expect(outletDc12vServiceMock.updateOutputConsumption).toHaveBeenCalledWith(2.1);
      });

      it('should update output watts-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as DeltaPro3AllQuotaData);

        await accessory.initializeDefaultValues();

        expect(outletAcHvServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletAcLvServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
        expect(outletDc12vServiceMock.updateOutputConsumption).not.toHaveBeenCalled();
      });
    });

    describe('updateSwitchStateValues', () => {
      it('should update switch-related characteristics when is requested', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

        await accessory.initializeDefaultValues();

        expect(outletAcHvServiceMock.updateState).toHaveBeenCalledWith(true);
        expect(outletAcLvServiceMock.updateState).toHaveBeenCalledWith(false);
        expect(outletDc12vServiceMock.updateState).toHaveBeenCalledWith(false);
        // expect(switchXboostServiceMock.updateState).toHaveBeenCalledWith(false);
      });

      it('should update switch-related characteristics when is requested and quotas were not initialized properly for it', async () => {
        httpApiManagerMock.getAllQuotas.mockResolvedValueOnce({} as DeltaPro3AllQuotaData);

        await accessory.initializeDefaultValues();

        expect(outletAcHvServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletAcLvServiceMock.updateState).not.toHaveBeenCalled();
        expect(outletDc12vServiceMock.updateState).not.toHaveBeenCalled();
        expect(switchXboostServiceMock.updateState).not.toHaveBeenCalled();
      });
    });
  });
});
