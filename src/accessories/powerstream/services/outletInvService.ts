import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';

export class OutletInvService extends OutletServiceBase {
  protected override setOn(): Promise<void> {
    throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.READ_ONLY_CHARACTERISTIC);
  }
}
