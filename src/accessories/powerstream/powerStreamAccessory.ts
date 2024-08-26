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
import { IndicatorService } from '@ecoflow/accessories/powerstream/services/indicatorService';
import { OutletInvService } from '@ecoflow/accessories/powerstream/services/outletInvService';
import { OutletService } from '@ecoflow/accessories/powerstream/services/outletService';
import { PowerDemandService } from '@ecoflow/accessories/powerstream/services/powerDemandService';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { EcoFlowMqttApiManager } from '@ecoflow/apis/ecoFlowMqttApiManager';
import { MqttQuotaMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { DeviceConfig, PowerStreamConsumptionType } from '@ecoflow/config';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Logging, PlatformAccessory } from 'homebridge';

export class PowerStreamAccessory extends EcoFlowAccessoryWithQuotaBase<PowerStreamAllQuotaData> {
  private readonly inverterOutletService: OutletInvService;
  private readonly solarOutletService: OutletService;
  private readonly batteryOutletService: OutletService;
  private readonly inverterIndicatorService: IndicatorService;
  private readonly inverterPowerDemandService: PowerDemandService;

  constructor(
    platform: EcoFlowHomebridgePlatform,
    accessory: PlatformAccessory,
    config: DeviceConfig,
    log: Logging,
    httpApiManager: EcoFlowHttpApiManager,
    mqttApiManager: EcoFlowMqttApiManager
  ) {
    super(platform, accessory, config, log, httpApiManager, mqttApiManager);

    this.inverterOutletService = new OutletInvService(this, config.powerStream?.inverter?.additionalCharacteristics);
    this.solarOutletService = new OutletService(this, 'PV', config.powerStream?.pv?.additionalCharacteristics);
    this.batteryOutletService = new OutletService(this, 'BAT', config.powerStream?.battery?.additionalCharacteristics);
    this.inverterIndicatorService = new IndicatorService(this, 1023);
    this.inverterPowerDemandService = new PowerDemandService(
      this,
      (config.powerStream?.type ?? PowerStreamConsumptionType.W600) * 10
    );
  }

  protected override getServices(): ServiceBase[] {
    return [
      this.inverterOutletService,
      this.solarOutletService,
      this.batteryOutletService,
      this.inverterIndicatorService,
      this.inverterPowerDemandService,
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
      const pvWatts = this.sum(params.pv1InputWatts, params.pv2InputWatts) * 0.1;
      this.solarOutletService.updateOutputConsumption(pvWatts);
    }
  }

  private updateBatteryValues(params: Heartbeat): void {
    if (params.batInputWatts !== undefined) {
      const batInputWatts = params.batInputWatts * 0.1;
      if (batInputWatts >= 0) {
        this.batteryOutletService.updateOutputConsumption(batInputWatts);
      }
      if (batInputWatts <= 0) {
        const watts = Math.abs(batInputWatts);
        this.batteryOutletService.updateInputConsumption(watts);
      }
    }
    if (params.batSoc !== undefined) {
      this.batteryOutletService.updateBatteryLevel(params.batSoc);
    }
  }

  private updateInverterValues(params: Heartbeat): void {
    if (params.invOutputWatts !== undefined) {
      const invOutputWatts = params.invOutputWatts * 0.1;
      if (invOutputWatts >= 0) {
        this.inverterOutletService.updateOutputConsumption(invOutputWatts);
      }
      if (invOutputWatts <= 0) {
        this.inverterOutletService.updateInputConsumption(Math.abs(invOutputWatts));
      }
    }

    if (params.invOnOff !== undefined) {
      this.inverterOutletService.updateState(params.invOnOff);
      this.inverterPowerDemandService.updateState(params.invOnOff);
    }

    if (params.invBrightness !== undefined) {
      this.inverterIndicatorService.updateState(true);
      this.inverterIndicatorService.updateBrightness(params.invBrightness);
    }

    if (params.permanentWatts !== undefined) {
      this.inverterPowerDemandService.updateRotationSpeed(params.permanentWatts * 0.1);
    }
  }
}
