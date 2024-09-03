import { ChangedCallbackHandler } from '../interfaces/contracts';
import { PluginConfigSchemaEnum, PluginConfigSchemaObject } from '../interfaces/homebridge';

export class CommonRenderer {
  public renderTextBox(
    $parent: JQuery,
    id: string,
    schemaProperty: PluginConfigSchemaObject,
    value: string,
    onChangeCallback: ChangedCallbackHandler
  ): void {
    const template = `
    <div class="form-group">
      <label for="device{id}" class="{requiredClass}">{title}</label>
      <input type="text" class="form-control" id="device{id}" placeholder="{description}" required="{required}" />
    </div>`;

    const html = template
      .replace(/{id}/g, id)
      .replace(/{title}/g, schemaProperty.title)
      .replace(/{description}/g, schemaProperty.description ?? '')
      .replace(/{requiredClass}/g, schemaProperty.required ? 'required-label' : '')
      .replace(/{required}/g, (schemaProperty.required ?? false).toString());
    $parent.append(html);

    const $control = $(`#device${id}`, $parent);
    $control.val(value);
    $control.on('change', () => onChangeCallback($control.val()?.toString() || ''));
  }

  public renderDropDown(
    $parent: JQuery,
    id: string,
    schemaProperty: PluginConfigSchemaEnum,
    value: string,
    onChangeCallback: ChangedCallbackHandler
  ): void {
    const template = `
    <div class="form-group">
      <label for="device{id}" class="{requiredClass}">{title}</label>
      <select class="form-control" id="device{id}" required="{required}"></select>
    </div>`;
    const html = template
      .replace(/{id}/g, id)
      .replace(/{title}/g, schemaProperty.title)
      .replace(/{requiredClass}/g, schemaProperty.required ? 'required-label' : '')
      .replace(/{required}/g, (schemaProperty.required ?? false).toString());
    $parent.append(html);

    const $control = $(`#device${id}`, $parent);
    schemaProperty.enum.forEach((enumValue: string) => {
      const $option = $('<option>').val(enumValue).text(enumValue);
      $control.append($option);
    });
    if (value !== undefined) {
      $control.val(value);
    }
    $control.on('change', () => onChangeCallback($control.val()?.toString() || ''));
  }
}
