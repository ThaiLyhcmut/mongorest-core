const a = {
  json: {
    type: 'object',
    properties: {
      'short-answer': {
        title: 'short-answer',
        type: 'string',
        widget: 'shortAnswer'
      },
      password: {
        title: 'password',
        type: 'string',
        widget: 'password',
        description: 'admin2024@gmail.com',
        default: 'loginto123'
      },
      'long-answer': {
        title: 'long-answer',
        type: 'string',
        widget: 'textarea',
        customRole: 'textarea'
      },
      slug: {
        title: 'slug',
        type: 'string',
        widget: 'UriKeyGen'
      },
      number: {
        title: 'number',
        type: 'string',
        widget: 'numberInput'
      },
      range: {
        title: 'range',
        type: 'string',
        widget: 'range'
      },
      'date-time': {
        title: 'date-time',
        type: 'string',
        widget: 'dateTime',
        displayFormat: 'yyyy/MM/dd HH:mm:ss',
        formatDate: 'date-time',
        disabled: false,
        field: 'single',
        mode: 'dateTime'
      },
      date: {
        title: 'date',
        type: 'string',
        widget: 'date',
        displayFormat: 'yyyy/MM/dd',
        formatDate: 'date',
        disabled: false,
        field: 'single',
        mode: 'date'
      },
      time: {
        title: 'time',
        type: 'string',
        widget: 'time',
        displayFormat: 'HH:mm:ss',
        formatDate: 'time',
        disabled: false,
        min: '00:00:00',
        max: '23:59:59',
        field: 'single',
        mode: 'time'
      },
      radio: {
        title: 'radio',
        type: 'string',
        widget: 'radio',
        choices: 'a:a\nb:b',
        default: 'a',
        allowNull: true,
        allowCustom: true
      },
      select: {
        title: 'select',
        type: 'string',
        widget: 'select',
        choices: [
          {
            key: 'a',
            value: 'a'
          },
          {
            key: 'b',
            value: 'b'
          }
        ],
        default: 'a',
        allowNull: true,
        isMultiple: true
      },
      checkbox: {
        title: 'checkbox',
        type: 'string',
        default: 'a',
        widget: 'checkbox',
        choices: [
          {
            key: 'a',
            value: 'a'
          },
          {
            key: 'b',
            value: 'b'
          }
        ],
        allowCustom: false,
        returnValue: 2,
        layout: 0,
        toggleAll: true
      },
      'true-false': {
        title: 'true-false',
        type: 'string',
        default: true,
        widget: 'boolean',
        appearance: 'checkbox'
      },
      relation: {
        title: 'relation',
        type: 'string',
        widget: 'relation',
        typeRelation: {
          title: 'entity',
          entity: 'entity',
          type: 'n-1',
          filter: {
            combinator: 'and',
            rules: [],
            id: 'a2428063-ad93-4b40-810d-cba9f149319c'
          }
        }
      },
      'single-image': {
        title: 'single-image',
        type: 'string',
        widget: 'file',
        meta: 'desc here'
      },
      'multi-image': {
        title: 'multi-image',
        type: 'string',
        widget: 'multipleFiles',
        meta: 'desc here'
      },
      'multi-images-resp': {
        title: 'multi-images-resp',
        type: 'string',
        widget: 'multiImage',
        fields: [
          'main',
          'mainMb',
          'bg',
          'bgMb'
        ]
      },
      condition: {
        title: 'condition',
        type: 'string',
        widget: 'condition',
        typeUI: 'filter'
      },
      array: {
        title: 'array',
        type: 'array',
        items: {
          type: 'object'
        },
        minItems: 1,
        maxItems: 1111
      },
      data: {
        title: 'data',
        type: 'string',
        widget: 'dataWidget'
      },
      href: {
        title: 'href',
        type: 'string',
        widget: 'href',
        hiddenTitle: true
      },
      icon: {
        title: 'icon',
        type: 'string',
        widget: 'icon',
        default: 'AArrowDown'
      },
      function: {
        title: 'function',
        type: 'string',
        widget: 'function'
      }
    },
    dependencies: {},
    required: []
  },
  ui: {
    'short-answer': {
      'ui:widget': 'shortAnswer'
    },
    password: {
      'ui:widget': 'password'
    },
    'long-answer': {
      'ui:widget': 'textarea'
    },
    slug: {
      'ui:widget': 'UriKeyGen'
    },
    number: {
      'ui:widget': 'numberInput'
    },
    range: {
      'ui:widget': 'range'
    },
    'date-time': {
      'ui:widget': 'dateTime'
    },
    date: {
      'ui:widget': 'date'
    },
    time: {
      'ui:widget': 'time'
    },
    radio: {
      'ui:widget': 'radio'
    },
    select: {
      'ui:widget': 'select'
    },
    checkbox: {
      'ui:widget': 'checkbox'
    },
    'true-false': {
      'ui:widget': 'boolean'
    },
    relation: {
      'ui:widget': 'relation'
    },
    'single-image': {
      'ui:widget': 'file'
    },
    'multi-image': {
      'ui:widget': 'multipleFiles'
    },
    'multi-images-resp': {
      'ui:widget': 'multiImage'
    },
    condition: {
      'ui:widget': 'condition'
    },
    data: {
      'ui:widget': 'dataWidget'
    },
    href: {
      'ui:widget': 'href'
    },
    icon: {
      'ui:widget': 'icon'
    },
    function: {
      'ui:widget': 'function'
    },
    'ui:order': [
      'short-answer',
      'password',
      'long-answer',
      'slug',
      'number',
      'range',
      'date-time',
      'date',
      'time',
      'radio',
      'select',
      'checkbox',
      'true-false',
      'relation',
      'single-image',
      'multi-image',
      'multi-images-resp',
      'condition',
      'array',
      'data',
      'href',
      'icon',
      'function'
    ]
  }
}

// //import { HttpException } from "@nestjs/common";
// import Ajv from "ajv";
// import addFormats from "ajv-formats";
// import { isMongoId } from "class-validator";
// //import { appSettings } from "src/_cores/config/appsettings";

// // Create AJV instance with custom keywords
// function createAjvInstance(): Ajv {
//     const ajv = new Ajv({
//         allErrors: true,
//         useDefaults: true,
//         coerceTypes: false,
//         removeAdditional: true,
//         strict: false
//     });
    
//     addFormats(ajv);
//     setupCustomKeywords(ajv);
//     return ajv;
// }

// // Setup all custom keywords for AJV
// function setupCustomKeywords(ajv: Ajv): void {
//     // Widget validation keyword
//     ajv.addKeyword({
//         keyword: "widgetValidation",
//         type: ["string", "number", "boolean", "array", "object", "null"],
//         schemaType: "object",
//         modifying: true,
//         compile: (schema) => {
//             return function validate(data: any, dataCxt: any) {
//                 const { widget, choices, isMultiple, typeSelect, typeRelation, default: defaultValue } = schema;
                
//                 switch (widget) {
//                     case 'select':
//                         return validateSelectWidget(data, choices, isMultiple, dataCxt.parentDataProperty, dataCxt.parentData);
                        
//                     case 'file':
//                         return validateFileWidget(data, dataCxt.parentDataProperty, dataCxt.parentData);
                        
//                     case 'relation':
//                         return validateRelationWidget(data, typeSelect, typeRelation, dataCxt.parentDataProperty, dataCxt.parentData);
                        
//                     case 'boolean':
//                         return validateBooleanWidget(data, defaultValue, dataCxt.parentDataProperty, dataCxt.parentData);
                        
//                     case 'numberInput':
//                         return validateNumberWidget(data, defaultValue, dataCxt.parentDataProperty, dataCxt.parentData);
                        
//                     case 'shortAnswer':
//                     case 'textarea':
//                     case 'UriKeyGen':
//                     case 'color':
//                         return validateStringWidget(data, dataCxt.parentDataProperty);
                        
//                     default:
//                         return true;
//                 }
//             };
//         }
//     });
    
//     // Required field validation
//     ajv.addKeyword({
//         keyword: "customRequired",
//         type: "object",
//         schemaType: "object",
//         compile: (schema) => {
//             return function validate(data: any, dataCxt: any) {
//                 const { required = [], properties = {}, isUpdate = false } = schema;
                
//                 if (!isUpdate) {
//                     for (const field of required) {
//                         const fieldSchema = properties[field];
//                         const fieldValue = data[field];
                        
//                         // Skip if has default or is boolean
//                         if (fieldSchema?.default !== undefined || fieldSchema?.widget === 'boolean') {
//                             continue;
//                         }
                        
//                         if (isEmptyValue(fieldValue)) {
//                             throw new Error(`Field "${field}" is required but missing.`);
//                         }
//                     }
//                 }
                
//                 return true;
//             };
//         }
//     });
    
//     // Dependencies handling
//     ajv.addKeyword({
//         keyword: "customDependencies",
//         type: "object",
//         schemaType: "object",
//         modifying: true,
//         compile: (schema) => {
//             return function validate(data: any, dataCxt: any) {
//                 const { dependencies = {}, isUpdate = false } = schema;
//                 return processDependencies(data, dependencies, isUpdate);
//             };
//         }
//     });
    
//     // AllOf processing
//     ajv.addKeyword({
//         keyword: "customAllOf",
//         type: "object",
//         schemaType: "array",
//         modifying: true,
//         compile: (schema) => {
//             return function validate(data: any, dataCxt: any) {
//                 return processAllOf(data, schema, dataCxt.rootData.isUpdate || false);
//             };
//         }
//     });
// }

// // Widget validation functions
// function validateSelectWidget(data: any, choices: any[], isMultiple: boolean, propertyName: string, parentData: any): boolean {
//     if (!choices || !Array.isArray(choices)) return true;
    
//     const validChoices = choices.map(choice => choice.value);
    
//     if (isMultiple) {
//         let valueArray = Array.isArray(data) ? data : [data];
//         const invalidValues = valueArray.filter(v => !validChoices.includes(v));
        
//         if (invalidValues.length > 0) {
//             throw new Error(`Invalid value for field "${propertyName}". Expected one of: ${validChoices.join(', ')}`);
//         }
        
//         parentData[propertyName] = valueArray;
//     } else {
//         let singleValue = Array.isArray(data) ? data[0] : data;
        
//         if (Array.isArray(data) && data.length > 1) {
//             throw new HttpException(`Invalid value for field "${propertyName}". Expected a single value.`, 400);
//         }
        
//         if (!validChoices.includes(singleValue)) {
//             throw new Error(`Invalid value for field "${propertyName}". Expected one of: ${validChoices.join(', ')}`);
//         }
        
//         parentData[propertyName] = [singleValue];
//     }
    
//     return true;
// }

// function validateFileWidget(data: any, propertyName: string, parentData: any): boolean {
//     let fileArray = [];
    
//     if (data) {
//         fileArray = Array.isArray(data) ? data : [data];
        
//         // Validate MongoDB IDs
//         for (const fileId of fileArray) {
//             if (!isMongoId(fileId)) {
//                 throw new Error(`Invalid value for field "${propertyName}". Expected a valid MongoDB ID.`);
//             }
//         }
//     }
    
//     parentData[propertyName] = fileArray;
//     return true;
// }

// function validateRelationWidget(data: any, typeSelect: string, typeRelation: any, propertyName: string, parentData: any): boolean {
//     if (!data) return true;
    
//     if (typeSelect === 'multiple') {
//         let relationArray = Array.isArray(data) ? data : [data];
        
//         for (const relationId of relationArray) {
//             if (!isMongoId(relationId)) {
//                 throw new Error(`Invalid relation ID for field "${propertyName}". Expected a valid MongoDB ID.`);
//             }
//         }
        
//         parentData[propertyName] = relationArray;
//     } else {
//         let singleRelation = Array.isArray(data) ? data[0] : data;
        
//         if (Array.isArray(data) && data.length > 1) {
//             throw new HttpException(`Invalid value for field "${propertyName}". Expected a single value.`, 400);
//         }
        
//         if (!isMongoId(singleRelation)) {
//             throw new Error(`Invalid relation ID for field "${propertyName}". Expected a valid MongoDB ID.`);
//         }
        
//         parentData[propertyName] = singleRelation;
//     }
    
//     return true;
// }

// function validateBooleanWidget(data: any, defaultValue: any, propertyName: string, parentData: any): boolean {
//     if (data === undefined || data === null) {
//         if (defaultValue !== undefined) {
//             parentData[propertyName] = defaultValue;
//         }
//     } else {
//         if (typeof data === 'string' && data === 'false') {
//             parentData[propertyName] = false;
//         } else {
//             parentData[propertyName] = Boolean(data);
//         }
//     }
    
//     return true;
// }

// function validateNumberWidget(data: any, defaultValue: any, propertyName: string, parentData: any): boolean {
//     if (isNaN(data)) {
//         if (!isNaN(defaultValue)) {
//             parentData[propertyName] = Number(defaultValue);
//         } else {
//             throw new Error(`Invalid value for field "${propertyName}". Expected a number.`);
//         }
//     } else {
//         parentData[propertyName] = Number(data);
//     }
    
//     return true;
// }

// function validateStringWidget(data: any, propertyName: string): boolean {
//     if (data !== null && typeof data !== 'string') {
//         throw new Error(`Invalid value for field "${propertyName}". Expected a string. Actual: ${typeof data}`);
//     }
    
//     return true;
// }

// // Helper functions
// function isEmptyValue(value: any): boolean {
//     if (value === undefined || value === null) return true;
//     if (typeof value === 'string' && value.trim() === '') return true;
//     if (Array.isArray(value) && value.length === 0) return true;
//     if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return true;
    
//     return false;
// }

// function processDependencies(data: any, dependencies: any, isUpdate: boolean): boolean {
//     Object.keys(dependencies).forEach(dependentField => {
//         const dependentValue = data[dependentField];
//         if (dependentValue === undefined || dependentValue === null) return;
        
//         const dependency = dependencies[dependentField];
        
//         if (dependency.oneOf) {
//             processOneOfDependency(data, dependentField, dependentValue, dependency, isUpdate);
//         }
//     });
    
//     return true;
// }

// function processOneOfDependency(data: any, dependentField: string, dependentValue: any, dependency: any, isUpdate: boolean): void {
//     let matchedSchema = null;
//     let allDependentFields = new Set<string>();
    
//     // Collect all dependent fields
//     dependency.oneOf.forEach((variant: any) => {
//         Object.keys(variant.properties).forEach(propKey => {
//             if (propKey !== dependentField) {
//                 allDependentFields.add(propKey);
//             }
//         });
//     });
    
//     // Find matching schema
//     for (const variant of dependency.oneOf) {
//         if (variant.properties[dependentField]?.enum?.includes(dependentValue)) {
//             matchedSchema = variant;
            
//             // Set unrelated fields to null
//             allDependentFields.forEach(fieldName => {
//                 if (!variant.properties[fieldName]) {
//                     data[fieldName] = null;
//                 }
//             });
            
//             // Process additional properties
//             processVariantProperties(data, variant, isUpdate);
//             break;
//         }
//     }
// }

// function processVariantProperties(data: any, variant: any, isUpdate: boolean): void {
//     const additionalRequiredFields = variant.required || [];
    
//     Object.keys(variant.properties).forEach(propKey => {
//         const propSchema = variant.properties[propKey];
//         const propValue = data[propKey];
        
//         // Check required fields
//         if (additionalRequiredFields.includes(propKey) && 
//             isEmptyValue(propValue) && !isUpdate) {
//             throw new HttpException(
//                 `Field "${propKey}" is required when dependent field condition is met.`,
//                 400
//             );
//         }
        
//         // Process field value
//         if (propValue !== undefined && propValue !== null) {
//             processFieldByWidget(data, propKey, propSchema, propValue, isUpdate);
//         } else {
//             data[propKey] = null;
//         }
//     });
// }

// function processAllOf(data: any, allOfSchemas: any[], isUpdate: boolean): boolean {
//     allOfSchemas.forEach((condition, index) => {
//         if (condition.if && condition.then) {
//             // Process if-then conditions
//             const conditionMet = checkIfCondition(data, condition.if);
            
//             if (conditionMet) {
//                 processThenSchema(data, condition.then, isUpdate, index);
//             }
//         } else {
//             // Process regular schema conditions
//             processRegularSchema(data, condition, isUpdate);
//         }
//     });
    
//     return true;
// }

// function checkIfCondition(data: any, ifCondition: any): boolean {
//     if (!ifCondition.properties) return false;
    
//     return Object.keys(ifCondition.properties).every(propKey => {
//         const propCondition = ifCondition.properties[propKey];
//         const propValue = data[propKey];
        
//         if (propCondition.contains) {
//             if (Array.isArray(propValue) && propCondition.contains.const) {
//                 return propValue.includes(propCondition.contains.const);
//             }
//             return false;
//         }
        
//         return true;
//     });
// }

// function processThenSchema(data: any, thenSchema: any, isUpdate: boolean, conditionIndex: number): void {
//     if (thenSchema.properties) {
//         Object.keys(thenSchema.properties).forEach(propKey => {
//             if (data[propKey] !== undefined && !data.hasOwnProperty(propKey)) {
//                 const propSchema = thenSchema.properties[propKey];
//                 processFieldByWidget(data, propKey, propSchema, data[propKey], isUpdate);
//             }
//         });
//     }
    
//     // Check required fields
//     if (thenSchema.required && !isUpdate) {
//         thenSchema.required.forEach((requiredField: string) => {
//             if (isEmptyValue(data[requiredField])) {
//                 throw new HttpException(
//                     `Field "${requiredField}" is required based on condition ${conditionIndex + 1}.`,
//                     400
//                 );
//             }
//         });
//     }
// }

// function processRegularSchema(data: any, schema: any, isUpdate: boolean): void {
//     if (schema.properties) {
//         Object.keys(schema.properties).forEach(propKey => {
//             const propSchema = schema.properties[propKey];
//             const propValue = data[propKey];
            
//             if (propValue !== undefined && propValue !== null && !data.hasOwnProperty(propKey + '_processed')) {
//                 processFieldByWidget(data, propKey, propSchema, propValue, isUpdate);
//                 data[propKey + '_processed'] = true; // Mark as processed
//             }
//         });
//     }
    
//     if (schema.required && !isUpdate) {
//         schema.required.forEach((requiredField: string) => {
//             if (isEmptyValue(data[requiredField])) {
//                 throw new HttpException(
//                     `Field "${requiredField}" is required based on schema condition.`,
//                     400
//                 );
//             }
//         });
//     }
// }

// function processFieldByWidget(data: any, fieldKey: string, fieldSchema: any, fieldValue: any, isUpdate: boolean): void {
//     const { widget } = fieldSchema;
    
//     switch (widget) {
//         case 'select':
//             validateSelectWidget(fieldValue, fieldSchema.choices, fieldSchema.isMultiple, fieldKey, data);
//             break;
            
//         case 'relation':
//             validateRelationWidget(fieldValue, fieldSchema.typeSelect, fieldSchema.typeRelation, fieldKey, data);
//             break;
            
//         case 'numberInput':
//             validateNumberWidget(fieldValue, fieldSchema.default, fieldKey, data);
//             break;
            
//         case 'boolean':
//             validateBooleanWidget(fieldValue, fieldSchema.default, fieldKey, data);
//             break;
            
//         case 'shortAnswer':
//         case 'textarea':
//             if (typeof fieldValue !== 'string') {
//                 throw new Error(`Invalid value for field "${fieldKey}". Expected a string.`);
//             }
//             data[fieldKey] = fieldValue;
//             break;
            
//         default:
//             data[fieldKey] = fieldValue;
//             break;
//     }
// }

// function convertSchemaToAjv(jsonSchema: any, isUpdate: boolean = false): any {
//     const ajvSchema: any = {
//         type: "object",
//         properties: {},
//         additionalProperties: false,
//     };
    
//     // Add custom validation keywords
//     ajvSchema.customRequired = {
//         required: jsonSchema.required || [],
//         properties: jsonSchema.properties || {},
//         isUpdate: isUpdate
//     };
    
//     if (jsonSchema.dependencies) {
//         ajvSchema.customDependencies = {
//             dependencies: jsonSchema.dependencies,
//             isUpdate: isUpdate
//         };
//     }
    
//     if (jsonSchema.allOf) {
//         ajvSchema.customAllOf = jsonSchema.allOf;
//     }
    
//     // Convert properties
//     if (jsonSchema.properties) {
//         Object.keys(jsonSchema.properties).forEach(key => {
//             const prop = jsonSchema.properties[key];
//             ajvSchema.properties[key] = convertProperty(prop);
//         });
//     }
    
//     return ajvSchema;
// }

// // THAY THẾ HÀM convertProperty CŨ BẰNG HÀM NÀY:
// function convertProperty(prop: any): any {
//     const converted: any = {
//         type: prop.type || "string"
//     };
    
//     // Xử lý type đặc biệt cho các widget
//     if (prop.widget === 'select') {
//         // Widget select luôn lưu dạng array
//         converted.type = "array";
//         converted.items = { type: "string" };
//     } else if (prop.widget === 'relation') {
//         // Widget relation: array nếu multiple, string nếu single
//         if (prop.typeSelect === 'multiple') {
//             converted.type = "array";
//             converted.items = { type: "string" };
//         } else {
//               converted.type = "array";
//             converted.items = { type: "string" };
//         }
//     } else if (prop.widget === 'file') {
//         // Widget file luôn lưu dạng array

//         converted.type = "array";
//         converted.items = { type: "string" };
//         converted.nullable = true;
//     } else if (prop.widget === 'boolean') {
//         converted.type = "boolean";
//     } else if (prop.widget === 'numberInput') {
//         converted.type = "number";
//     }
    
//     // Add default values
//     if (prop.default !== undefined) {
//         converted.default = prop.default;
//     }
    
//     // Add widget validation
//     if (prop.widget) {
//         converted.widgetValidation = {
//             widget: prop.widget,
//             choices: prop.choices,
//             isMultiple: prop.isMultiple,
//             typeSelect: prop.typeSelect,
//             typeRelation: prop.typeRelation,
//             default: prop.default
//         };
//     }
    
//     // Handle nested objects
//     if (prop.type === 'object' && prop.properties) {
//         converted.properties = {};
//         Object.keys(prop.properties).forEach(nestedKey => {
//             converted.properties[nestedKey] = convertProperty(prop.properties[nestedKey]);
//         });
        
//         if (prop.required) {
//             converted.required = prop.required;
//         }
//     }
    
//     // Handle date widgets
//     if (prop.widget?.includes('date')) {
//         converted.format = 'date-time';
//     }
    
//     // Handle nullable fields
//     if (prop.nullable || prop.required === false) {
//         if (Array.isArray(converted.type)) {
//             if (!converted.type.includes("null")) {
//                 converted.type.push("null");
//             }
//         } else {
//             converted.type = [converted.type, "null"];
//         }
//     }
    
//     return converted;
// }

// function processDateFields(data: any, properties: any): void {
//     Object.keys(properties).forEach(key => {
//         const prop = properties[key];
        
//         if (prop.widget?.includes('date') && data[key]) {
//             data[key] = new Date(appSettings.timeZoneMongoDB.getCustomTime(data[key]));
//         }
        
//         // Process nested objects
//         if (prop.type === 'object' && prop.properties && data[key]) {
//             processDateFields(data[key], prop.properties);
//         }
//     });
// }

// // Main filter function
// export function filterData(jsonSchema: any, body: any, is_update: boolean = false): any {
//     try {
//         // Create AJV instance
//         const ajv = createAjvInstance();
        
//         // Convert to AJV schema
//         const ajvSchema = convertSchemaToAjv(jsonSchema, is_update);
        
//         // Add isUpdate to root data for access in keywords
//         const dataWithContext: any = { ...body, isUpdate: is_update };
        
//         // Compile and validate
//         const validate = ajv.compile(ajvSchema);
//         const isValid = validate(dataWithContext);
        
//         if (!isValid) {
//             const errorMessages = validate.errors?.map(err => 
//                 `${err.instancePath || 'root'}: ${err.message}`
//             ).join(', ') || 'Validation failed';
            
//             throw new HttpException(errorMessages, 400);
//         }
        
//         // Cast back to any since we know validation passed
//         const validatedData = dataWithContext as any;
        
//         // Remove context data
//         delete validatedData.isUpdate;
        
//         // Process date fields
//         processDateFields(validatedData, jsonSchema.properties || {});
        
//         return validatedData;
        
//     } catch (error: any) {
//         if (error instanceof HttpException) {
//             throw error;
//         }
//         throw new HttpException(error.message || 'Validation failed', 400);
//     }
// }

// // Usage examples:
// /*
// // Basic usage (same as before)
// const filteredData = filterData(tenantSchema.json_schema, requestBody, false);

// // For updates
// const updatedData = filterData(tenantSchema.json_schema, requestBody, true);
// */