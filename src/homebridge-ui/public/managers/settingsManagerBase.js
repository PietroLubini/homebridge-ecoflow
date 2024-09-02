export class SettingsManagerBase {
  renderInput(
    $parent,
    id,
    context,
    propertyNamePaths,
    schemaProperty,
    configuration,
    updateOnChange,
    setValue,
    getValue,
    index,
    template
  ) {
    const conf = this.getConfigurationForProperty(configuration, propertyNamePaths, false);
    const value = conf ? conf[propertyNamePaths.at(-1)] : undefined;
    const html = template
      .replace(/{id}/g, id)
      .replace(/{title}/g, schemaProperty.title)
      .replace(/{description}/g, schemaProperty.description ?? '')
      .replace(/{requiredClass}/g, schemaProperty.required ? 'required-label' : '')
      .replace(/{required}/g, (schemaProperty.required ?? false).toString());
    $parent.append(html);

    const $control = $(`#device${id}`, $parent);
    if (value !== undefined) {
      setValue($control, value);
    }
    if (updateOnChange) {
      $control.change(() =>
        this.updateChangesFunction($control, context, configuration, propertyNamePaths, getValue, index)
      );
    } else {
      $control.blur(() =>
        this.updateChangesFunction($control, context, configuration, propertyNamePaths, getValue, index)
      );
    }

    return $control;
  }

  async updateChangesFunction($control, context, configuration, propertyNamePaths, getValue, index) {
    const conf = this.getConfigurationForProperty(configuration, propertyNamePaths, true);
    conf[propertyNamePaths.at(-1)] = getValue($control);
    await this.updateChanges(context, index, propertyNamePaths);
  }

  getConfigurationForProperty(configuration, propertyNamePaths, updating) {
    let paths = propertyNamePaths.filter(p => p !== 'properties');
    let conf = configuration;
    paths = updating ? paths.slice(0, -1) : paths;
    paths.forEach(path => {
      if (conf !== undefined) {
        if (conf[path] === undefined && updating) {
          conf[path] = {};
        }
        conf = conf[path];
      }
    });
    return conf;
  }

  updateChanges() {}

  renderTextBox($parent, id, context, propertyNamePaths, schemaProperty, configuration, index) {
    this.renderInput(
      $parent,
      id,
      context,
      propertyNamePaths,
      schemaProperty,
      configuration,
      false,
      ($control, value) => {
        $control.val(value);
      },
      $control => $control.val(),
      index,
      `
    <div class="form-group">
      <label for="device{id}" class="{requiredClass}">{title}</label>
      <input type="text" class="form-control" id="device{id}" placeholder="{description}" required="{required}" />
    </div>`
    );
  }

  renderCheckBox($parent, id, context, propertyNamePaths, schemaProperty, configuration, index) {
    this.renderInput(
      $parent,
      id,
      context,
      propertyNamePaths,
      schemaProperty,
      configuration,
      true,
      ($control, value) => {
        $control.prop('checked', value);
      },
      $control => $control.prop('checked'),
      index,
      `
      <label for="device{id}" class="hb-uix-switch">
        <input type="checkbox" id="device{id}" />
        <span>{title}</span>
        <span class="hb-uix-slider hb-uix-round" id="deviceCheckbox{id}"></span>
      </label>`
    );
  }

  renderDropDown($parent, id, context, propertyNamePaths, schemaProperty, configuration, index) {
    const value = this.getConfigurationForProperty(configuration, propertyNamePaths, false);
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
      $control.change(() => this.updateChangesFunction($control, context, configuration, propertyNamePaths, index));
    }
  }

  renderProperties($parent, context, schema, configuration, index) {
    context.propertiesNames.forEach(propertyNamePath => {
      const propertyNamePaths = propertyNamePath.split('.');
      let propertySchema = schema;
      propertyNamePaths.forEach(propertyNamePath => {
        propertySchema = propertySchema[propertyNamePath];
      });
      const propertyName = propertyNamePaths.at(-1);
      const propertyId = index ? propertyName + index : propertyName;
      if (propertySchema.enum) {
        this.renderDropDown($parent, propertyId, context, propertyNamePaths, propertySchema, configuration, index);
      } else if (propertySchema.type === 'boolean') {
        this.renderCheckBox($parent, propertyId, context, propertyNamePaths, propertySchema, configuration, index);
      } else if (propertySchema.type === 'string') {
        this.renderTextBox($parent, propertyId, context, propertyNamePaths, propertySchema, configuration, index);
      }
    });
  }

  async updatePluginConfig(configuration) {
    const changes = this.clone(configuration);
    delete changes.platform;
    console.log('[a] changes: ', changes);
    // eslint-disable-next-line no-undef
    await homebridge.updatePluginConfig([changes]);
  }

  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}
