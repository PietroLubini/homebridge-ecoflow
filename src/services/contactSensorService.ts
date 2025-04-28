import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic } from 'homebridge';

export class ContactSensorService extends ServiceBase {
  private contactState: number = this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED;

  constructor(
    protected readonly ecoFlowAccessory: EcoFlowAccessoryBase,
    serviceSubType?: string
  ) {
    super(ecoFlowAccessory.platform.Service.ContactSensor, ecoFlowAccessory, serviceSubType);
  }

  protected override addCharacteristics(): Characteristic[] {
    const contactSensorStateCharacteristic = this.addCharacteristic(
      this.platform.Characteristic.ContactSensorState
    ).onGet(() => this.processOnGet(this.contactState));
    return [contactSensorStateCharacteristic];
  }

  public updateState(closed: boolean): void {
    this.contactState = closed
      ? this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED
      : this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;

    this.updateCharacteristic(this.platform.Characteristic.ContactSensorState, 'State', this.contactState);
  }
}
