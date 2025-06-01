import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { Enum } from '@ecoflow/apis/interfaces/generalContacts';
import { FanServiceBase } from '@ecoflow/services/fanServiceBase';

export abstract class FanPositionedServiceBase<TPositionType, TPositionTypeObj extends Enum> extends FanServiceBase {
  private readonly positionLength: number;
  private readonly positionValues: TPositionType[];
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, serviceSubType: string, positionTypeObj: TPositionTypeObj) {
    super(ecoFlowAccessory, 100, serviceSubType);
    this.positionValues = Object.values(positionTypeObj)
      .filter(v => typeof v === 'number')
      .map(v => v as TPositionType);
    this.positionLength = 100 / this.positionValues.length;
  }

  public updatePositionedRotationSpeed(value: TPositionType): void {
    super.updateRotationSpeed(this.covertFromPositionedValue(value));
  }

  public updateRotationSpeed(): void {
    this.log.warn('Use updatePositionedRotationSpeed method instead of updateRotationSpeed. Ignoring call.');
  }

  protected override async processOnSetRotationSpeed(value: number, revert: () => void): Promise<void> {
    const positionedValue = this.covertToPositionedValue(value);
    await this.processOnSetPositionedRotationSpeed(positionedValue, revert);
  }

  protected abstract processOnSetPositionedRotationSpeed(value: TPositionType, revert: () => void): Promise<void>;

  private covertToPositionedValue(value: number): TPositionType {
    const pos = Math.floor(value / this.positionLength);
    return this.positionValues[pos];
  }

  private covertFromPositionedValue(value: TPositionType): number {
    const pos = value as unknown as number;
    return Math.round(pos * this.positionLength);
  }
}
