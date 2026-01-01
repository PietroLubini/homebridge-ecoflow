import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import { Heartbeat, SmartPlugAllQuotaData } from '@ecoflow/accessories/smartplug/interfaces/smartPlugHttpApiContracts';
import {
  SmartPlugMqttMessageFuncType,
  SmartPlugMqttMessageType,
  SmartPlugMqttQuotaMessage,
  SmartPlugMqttQuotaMessageWithParams,
} from '@ecoflow/accessories/smartplug/interfaces/smartPlugMqttApiContracts';
import { BrightnessService } from '@ecoflow/accessories/smartplug/services/brightnessService';
import { OutletService } from '@ecoflow/accessories/smartplug/services/outletService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { TemperatureSensorService } from '@ecoflow/services/temperatureSensorService';
import { Logging, PlatformAccessory } from 'homebridge';

export class SmartPlugAccessory extends EcoFlowAccessoryWithQuotaBase<SmartPlugAllQuotaData> {
  private readonly outletService: OutletService;
  private readonly temperatureService: TemperatureSensorService;
  private readonly brightnessService: BrightnessService;

  constructor(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    log: Logging,
    httpApiManager: EcoFlowHttpApiManager,
    mqttApiManager: EcoFlowMqttApiManager
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager);

    this.outletService = new OutletService(this, config.outlet?.additionalCharacteristics);
    this.temperatureService = new TemperatureSensorService(this);
    this.brightnessService = new BrightnessService(this, 1023);
  }

  protected override getServices(): ServiceBase[] {
    return [this.outletService, this.temperatureService, this.brightnessService];
  }

  protected override processQuotaMessage(message: MqttQuotaMessage): void {
    const smartPlugMessage = message as SmartPlugMqttQuotaMessage;
    if (smartPlugMessage.cmdFunc === SmartPlugMqttMessageFuncType.Func2 && smartPlugMessage.cmdId === SmartPlugMqttMessageType.Heartbeat) {
      const heartbeat = (message as SmartPlugMqttQuotaMessageWithParams<Heartbeat>).param;
      this.updateParamsValues(heartbeat, this.quota['2_1'], this.updateHeartbeatValues.bind(this));
    }
  }

  protected override initializeQuota(quota: SmartPlugAllQuotaData | null): SmartPlugAllQuotaData {
    const result = quota ?? ({} as SmartPlugAllQuotaData);
    if (!result['2_1']) {
      result['2_1'] = {};
    }
    return result;
  }

  protected override updateInitialValues(initialData: SmartPlugAllQuotaData): void {
    this.updateHeartbeatInitialValues(initialData['2_1']);
  }

  private updateHeartbeatInitialValues(params: Heartbeat): void {
    const message: SmartPlugMqttQuotaMessageWithParams<Heartbeat> = {
      cmdFunc: SmartPlugMqttMessageFuncType.Func2,
      cmdId: SmartPlugMqttMessageType.Heartbeat,
      param: params,
    };
    this.processQuotaMessage(message);
  }

  private updateHeartbeatValues(params: Heartbeat): void {
    this.updateOutletValues(params);
    this.updateBrightnessValues(params);
    this.updateTemperatureValues(params);
  }

  private updateOutletValues(params: Heartbeat): void {
    if (params.switchSta !== undefined) {
      this.outletService.updateState(params.switchSta);
    }
    if (params.watts !== undefined) {
      this.outletService.updateOutputConsumption(params.watts * 0.1);
    }
    if (params.current !== undefined) {
      this.outletService.updateOutputCurrent(params.current * 0.001);
    }
    if (params.volt !== undefined) {
      this.outletService.updateOutputVoltage(params.volt);
    }
  }

  private updateBrightnessValues(params: Heartbeat): void {
    if (params.brightness !== undefined) {
      this.brightnessService.updateState(params.brightness > 0);
      this.brightnessService.updateBrightness(params.brightness);
    }
  }

  private updateTemperatureValues(params: Heartbeat): void {
    if (params.temp !== undefined) {
      this.temperatureService.updateCurrentTemperature(params.temp);
    }
  }
}
