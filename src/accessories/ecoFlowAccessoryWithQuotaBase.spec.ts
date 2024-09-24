import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { DeviceConfig } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

interface MockAllQuotaContainer {
  param1?: number;
}

interface MockAllQuota {
  container?: MockAllQuotaContainer;
}

class MockEcoFlowAccessoryWithQuota extends EcoFlowAccessoryWithQuotaBase<MockAllQuota> {
  constructor(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    log: Logging,
    httpApiManager: EcoFlowHttpApiManager,
    mqttApiManager: EcoFlowMqttApiManager
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager);
  }

  public updateInitialValues(): void {}

  protected initializeQuota(quota: MockAllQuota | null): MockAllQuota {
    const result = quota ?? ({} as MockAllQuota);
    if (!result.container) {
      result.container = {};
    }
    return result;
  }

  protected getServices(): ServiceBase[] {
    return [];
  }

  protected processQuotaMessage(): void {}
}

describe('EcoFlowAccessoryWithQuotaBase', () => {
  let platformMock: jest.Mocked<EcoFlowHomebridgePlatform>;
  let accessoryMock: jest.Mocked<PlatformAccessory>;
  let logMock: jest.Mocked<Logging>;
  let httpApiManagerMock: jest.Mocked<EcoFlowHttpApiManager>;
  let mqttApiManagerMock: jest.Mocked<EcoFlowMqttApiManager>;
  let config: DeviceConfig;
  let accessory: MockEcoFlowAccessoryWithQuota;

  beforeEach(() => {
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
    accessory = new MockEcoFlowAccessoryWithQuota(
      platformMock,
      accessoryMock,
      config,
      logMock,
      httpApiManagerMock,
      mqttApiManagerMock
    );
  });

  describe('initializeDefaultValues', () => {
    let quota: MockAllQuota;
    let updateInitialValuesMock: jest.Mock;

    beforeEach(() => {
      quota = { container: { param1: 123 } };
      updateInitialValuesMock = jest.fn();
    });

    it('should initialize quota when is called before initializeDefaultValues', async () => {
      const expected: MockAllQuota = { container: {} };

      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    it('should get all quota when initialization of default values is requested', async () => {
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

      await accessory.initializeDefaultValues(false);
      const actual = accessory.quota;

      expect(actual).toBe(quota);
    });

    it('should not update initial values when quota is not received', async () => {
      accessory.updateInitialValues = updateInitialValuesMock;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(null);

      await accessory.initializeDefaultValues(true);

      expect(logMock.warn).toHaveBeenCalledWith('Quotas were not received');
      expect(updateInitialValuesMock).not.toHaveBeenCalled();
    });

    it('should initialize quotas with default values when they were not received', async () => {
      const expected: MockAllQuota = { container: {} };
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(null);

      await accessory.initializeDefaultValues(true);
      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    it(`should initialize quotas with default values when they were not received and
      updating of initial values is not requested`, async () => {
      const expected: MockAllQuota = { container: {} };
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(null);

      await accessory.initializeDefaultValues(false);
      const actual = accessory.quota;

      expect(actual).toEqual(expected);
    });

    it('should not update initial values when it is not requested', async () => {
      accessory.updateInitialValues = updateInitialValuesMock;
      httpApiManagerMock.getAllQuotas.mockResolvedValueOnce(quota);

      await accessory.initializeDefaultValues(false);
      const actual = accessory.quota;

      expect(actual).toBe(quota);
      expect(updateInitialValuesMock).not.toHaveBeenCalled();
    });
  });
});
