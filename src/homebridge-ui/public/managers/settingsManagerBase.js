export class SettingsManagerBase {
  renderTextBox($parent, id, schemaProperty, value, onChangeCallback) {
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
    $control.change(() => onChangeCallback($control.val()));
  }

  renderDropDown($parent, id, schemaProperty, value, onChangeCallback) {
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

    if (schemaProperty.enum) {
      const $control = $(`#device${id}`, $parent);
      schemaProperty.enum.forEach(enumValue => {
        const $option = $('<option>').val(enumValue).text(enumValue);
        $control.append($option);
      });
      if (value !== undefined) {
        $control.val(value);
      }
      $control.change(() => onChangeCallback($control.val()));
    }
  }

  async updatePluginConfig(configuration) {
    const changes = this.clone(configuration);
    delete changes.platform;
    await homebridge.updatePluginConfig([changes]);
  }

  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  applyChanges(target, source, readOnlyProperties) {
    Object.assign(target, source);
    for (const key in target) {
      if (source[key] === undefined && !readOnlyProperties.includes(key)) {
        delete target[key];
      }
    }
  }
}
