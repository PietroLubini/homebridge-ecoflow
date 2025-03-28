import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export class ContactSensorService extends ServiceBase {
  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryBase,
    serviceSubType?: string
  ) {
    super(ecoFlowAccessory.platform.Service.ContactSensor, ecoFlowAccessory, serviceSubType);
  }

  protected override addCharacteristics(): Characteristic[] {
    return [this.addCharacteristic(this.platform.Characteristic.ContactSensorState)];
  }

  public updateState(closed: boolean): void {
    this.updateCharacteristic(
      this.platform.Characteristic.ContactSensorState,
      `${this.serviceSubType ?? 'Contact'} State`,
      closed ? 0 : 1
    );
  }
}
