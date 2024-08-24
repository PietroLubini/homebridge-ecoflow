import { EcoFlowAccessoryWithQuotaBase } from '@ecoflow/accessories/ecoFlowAccessoryWithQuotaBase';
import {
  Heartbeat,
  PowerStreamAllQuotaData,
} from '@ecoflow/accessories/powerstream/interfaces/httpApiPowerStreamContracts';
import {
  MqttPowerStreamMessageFuncType,
  MqttPowerStreamMessageType,
  MqttPowerStreamQuotaMessage,
  MqttPowerStreamQuotaMessageWithParams,
} from '@ecoflow/accessories/powerstream/interfaces/mqttApiPowerStreamContracts';
import { LightBulbInvService } from '@ecoflow/accessories/powerstream/services/lightBulbInvService';
import { OutletInvService } from '@ecoflow/accessories/powerstream/services/outletInvService';
import { OutletService } from '@ecoflow/accessories/powerstream/services/outletService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { BatteryStatusService } from '@ecoflow/services/batteryStatusService';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

export class PowerStreamAccessory extends EcoFlowAccessoryWithQuotaBase<PowerStreamAllQuotaData> {
  private readonly batteryStatusService: BatteryStatusService;
  private readonly solarOutletService: OutletService;
  private readonly batteryOutletService: OutletService;
  private readonly inverterOutletService: OutletInvService;
  private readonly inverterLightBulbService: LightBulbInvService;

  constructor(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    log: Logging,
    httpApiManager: EcoFlowHttpApiManager,
    mqttApiManager: EcoFlowMqttApiManager
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager);
    this.batteryStatusService = new BatteryStatusService(this, 'BAT');
    this.solarOutletService = new OutletService(this, 'PV', config.powerStream?.solar?.additionalCharacteristics);
    this.batteryOutletService = new OutletService(this, 'BAT', config.powerStream?.battery?.additionalCharacteristics);
    this.inverterOutletService = new OutletInvService(
      this,
      'INV',
      config.powerStream?.inverter?.additionalCharacteristics
    );
    this.inverterLightBulbService = new LightBulbInvService(this);
  }

  protected override getServices(): ServiceBase[] {
    return [
      this.batteryStatusService,
      this.solarOutletService,
      this.batteryOutletService,
      this.inverterOutletService,
      this.inverterLightBulbService,
    ];
  }

  protected override processQuotaMessage(message: MqttQuotaMessage): void {
    const powerStreamMessage = message as MqttPowerStreamQuotaMessage;
    if (
      powerStreamMessage.cmdFunc === MqttPowerStreamMessageFuncType.Func20 &&
      powerStreamMessage.cmdId === MqttPowerStreamMessageType.Heartbeat
    ) {
      const heartbeat = (message as MqttPowerStreamQuotaMessageWithParams<Heartbeat>).param;
      Object.assign(this.quota['20_1'], heartbeat);
      this.updateHeartbeatValues(heartbeat);
    }
  }

  protected override initializeQuota(quota: PowerStreamAllQuotaData | null): PowerStreamAllQuotaData {
    const result = quota ?? ({} as PowerStreamAllQuotaData);
    if (!result['20_1']) {
      result['20_1'] = {};
    }
    return result;
  }

  protected override updateInitialValues(initialData: PowerStreamAllQuotaData): void {
    this.updateHeartbeatInitialValues(initialData['20_1']);
  }

  private updateHeartbeatInitialValues(params: Heartbeat): void {
    const message: MqttPowerStreamQuotaMessageWithParams<Heartbeat> = {
      cmdFunc: MqttPowerStreamMessageFuncType.Func20,
      cmdId: MqttPowerStreamMessageType.Heartbeat,
      param: params,
    };
    this.processQuotaMessage(message);
  }

  private updateHeartbeatValues(params: Heartbeat): void {
    this.updateSolarValues(params);
    this.updateBatteryValues(params);
    this.updateInverterValues(params);
  }

  private updateSolarValues(params: Heartbeat): void {
    if (params.pv1InputWatts !== undefined || params.pv2InputWatts !== undefined) {
      const pvWatts = this.sum(params.pv1InputWatts, params.pv2InputWatts);
      this.solarOutletService.updateOutputConsumption(pvWatts);
    }
  }

  private updateBatteryValues(params: Heartbeat): void {
    if (params.batInputWatts !== undefined) {
      if (params.batInputWatts >= 0) {
        this.batteryStatusService.updateChargingState(0);
        this.batteryOutletService.updateOutputConsumption(params.batInputWatts);
      }
      if (params.batInputWatts <= 0) {
        const watts = Math.abs(params.batInputWatts);
        this.batteryStatusService.updateChargingState(watts);
        this.batteryOutletService.updateInputConsumption(watts);
      }
    }
    if (params.batSoc !== undefined) {
      this.batteryStatusService.updateBatteryLevel(params.batSoc);
      this.batteryOutletService.updateBatteryLevel(params.batSoc);
    }
  }

  private updateInverterValues(params: Heartbeat): void {
    if (params.invOutputWatts !== undefined) {
      if (params.invOutputWatts >= 0) {
        this.inverterOutletService.updateOutputConsumption(params.invOutputWatts);
      }
      if (params.invOutputWatts <= 0) {
        this.inverterOutletService.updateInputConsumption(Math.abs(params.invOutputWatts));
      }
    }

    if (params.invOnOff !== undefined) {
      this.inverterOutletService.updateState(params.invOnOff);
    }

    if (params.invBrightness !== undefined) {
      this.inverterLightBulbService.updateState(true);
      this.inverterLightBulbService.updateBrightness(params.invBrightness);
    }
  }
}
