import Foundation

public struct WidgetNodeFields: WireModel {
    public var `id`: String
    public var `children`: [WidgetNode]?
    public var `title`: String?
    public var `description`: String?
    public var `confirm`: WidgetButtonSpec?
    public var `cancel`: WidgetButtonSpec?
    public var `collapsed`: Bool?
    public var `value`: WidgetNodeFieldsValue?
    public var `label`: String?
    public var `name`: String?
    public var `fieldName`: String?
    public var `onClickAction`: WidgetAction?
    public var `onSubmitAction`: WidgetAction?
    public var `options`: [WidgetNodeFieldsOptionsElement]?
    public var `defaultValue`: WidgetNodeFieldsDefaultValue?
    public var `defaultChecked`: Bool?
    public var `required`: Bool?
    public var `disabled`: Bool?
    public var `placeholder`: String?
    public var `inputType`: String?
    public var `data`: [[String: JSONValue]]?
    public var `series`: [[String: JSONValue]]?
    public var `xAxis`: WidgetNodeFieldsXAxis?
    public var `src`: String?
    public var `alt`: String?
    public var `size`: String?
    public var `color`: String?
    public var `width`: WidgetNodeFieldsWidth?
    public var `height`: WidgetNodeFieldsHeight?
    public var `gap`: Double?
    public var `padding`: [Double]?
    public var `direction`: String?
    public var `caption`: String?
    public var `meta`: String?
    public var `status`: WidgetNodeFieldsStatus?
    public var `align`: String?
    public var `justify`: String?
    public var `wrap`: Bool?
    public var `flex`: Double?
    public var `minWidth`: WidgetNodeFieldsMinWidth?
    public var `maxWidth`: WidgetNodeFieldsMaxWidth?
    public var `minHeight`: WidgetNodeFieldsMinHeight?
    public var `maxHeight`: WidgetNodeFieldsMaxHeight?
    public var `aspectRatio`: Double?
    public var `background`: String?
    public var `border`: JSONValue?
    public var `radius`: Double?
    public var `weight`: String?
    public var `textAlign`: String?
    public var `truncate`: Bool?
    public var `maxLines`: Double?
    public var `minLines`: Double?
    public var `italic`: Bool?
    public var `lineThrough`: Bool?
    public var `limit`: Double?
    public var `minSize`: WidgetNodeFieldsMinSize?
    public var `spacing`: Double?
    public var `flush`: Bool?
    public var `header`: Bool?
    public var `vAlign`: String?
    public var `colSpan`: Double?
    public var `rowSpan`: Double?
    public var `colSize`: String?
    public var `fit`: String?
    public var `position`: String?
    public var `frame`: Bool?
    public var `showYAxis`: Bool?
    public var `showLegend`: Bool?
    public var `showGrid`: Bool?
    public var `variant`: String?
    public var `pill`: Bool?
    public var `iconStart`: String?
    public var `iconEnd`: String?
    public var `block`: Bool?
    public var `submit`: Bool?
    public var `clearable`: Bool?
    public var `min`: String?
    public var `max`: String?
    public var `step`: Double?
    public var `ariaLabel`: String?
    public var `pattern`: String?
    public var `rows`: Double?
    public var `maxRows`: Double?
    public var `autoResize`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `children`: [WidgetNode]? = nil,
        `title`: String? = nil,
        `description`: String? = nil,
        `confirm`: WidgetButtonSpec? = nil,
        `cancel`: WidgetButtonSpec? = nil,
        `collapsed`: Bool? = nil,
        `value`: WidgetNodeFieldsValue? = nil,
        `label`: String? = nil,
        `name`: String? = nil,
        `fieldName`: String? = nil,
        `onClickAction`: WidgetAction? = nil,
        `onSubmitAction`: WidgetAction? = nil,
        `options`: [WidgetNodeFieldsOptionsElement]? = nil,
        `defaultValue`: WidgetNodeFieldsDefaultValue? = nil,
        `defaultChecked`: Bool? = nil,
        `required`: Bool? = nil,
        `disabled`: Bool? = nil,
        `placeholder`: String? = nil,
        `inputType`: String? = nil,
        `data`: [[String: JSONValue]]? = nil,
        `series`: [[String: JSONValue]]? = nil,
        `xAxis`: WidgetNodeFieldsXAxis? = nil,
        `src`: String? = nil,
        `alt`: String? = nil,
        `size`: String? = nil,
        `color`: String? = nil,
        `width`: WidgetNodeFieldsWidth? = nil,
        `height`: WidgetNodeFieldsHeight? = nil,
        `gap`: Double? = nil,
        `padding`: [Double]? = nil,
        `direction`: String? = nil,
        `caption`: String? = nil,
        `meta`: String? = nil,
        `status`: WidgetNodeFieldsStatus? = nil,
        `align`: String? = nil,
        `justify`: String? = nil,
        `wrap`: Bool? = nil,
        `flex`: Double? = nil,
        `minWidth`: WidgetNodeFieldsMinWidth? = nil,
        `maxWidth`: WidgetNodeFieldsMaxWidth? = nil,
        `minHeight`: WidgetNodeFieldsMinHeight? = nil,
        `maxHeight`: WidgetNodeFieldsMaxHeight? = nil,
        `aspectRatio`: Double? = nil,
        `background`: String? = nil,
        `border`: JSONValue? = nil,
        `radius`: Double? = nil,
        `weight`: String? = nil,
        `textAlign`: String? = nil,
        `truncate`: Bool? = nil,
        `maxLines`: Double? = nil,
        `minLines`: Double? = nil,
        `italic`: Bool? = nil,
        `lineThrough`: Bool? = nil,
        `limit`: Double? = nil,
        `minSize`: WidgetNodeFieldsMinSize? = nil,
        `spacing`: Double? = nil,
        `flush`: Bool? = nil,
        `header`: Bool? = nil,
        `vAlign`: String? = nil,
        `colSpan`: Double? = nil,
        `rowSpan`: Double? = nil,
        `colSize`: String? = nil,
        `fit`: String? = nil,
        `position`: String? = nil,
        `frame`: Bool? = nil,
        `showYAxis`: Bool? = nil,
        `showLegend`: Bool? = nil,
        `showGrid`: Bool? = nil,
        `variant`: String? = nil,
        `pill`: Bool? = nil,
        `iconStart`: String? = nil,
        `iconEnd`: String? = nil,
        `block`: Bool? = nil,
        `submit`: Bool? = nil,
        `clearable`: Bool? = nil,
        `min`: String? = nil,
        `max`: String? = nil,
        `step`: Double? = nil,
        `ariaLabel`: String? = nil,
        `pattern`: String? = nil,
        `rows`: Double? = nil,
        `maxRows`: Double? = nil,
        `autoResize`: Bool? = nil
    ) {
        self.`id` = `id`
        self.`children` = `children`
        self.`title` = `title`
        self.`description` = `description`
        self.`confirm` = `confirm`
        self.`cancel` = `cancel`
        self.`collapsed` = `collapsed`
        self.`value` = `value`
        self.`label` = `label`
        self.`name` = `name`
        self.`fieldName` = `fieldName`
        self.`onClickAction` = `onClickAction`
        self.`onSubmitAction` = `onSubmitAction`
        self.`options` = `options`
        self.`defaultValue` = `defaultValue`
        self.`defaultChecked` = `defaultChecked`
        self.`required` = `required`
        self.`disabled` = `disabled`
        self.`placeholder` = `placeholder`
        self.`inputType` = `inputType`
        self.`data` = `data`
        self.`series` = `series`
        self.`xAxis` = `xAxis`
        self.`src` = `src`
        self.`alt` = `alt`
        self.`size` = `size`
        self.`color` = `color`
        self.`width` = `width`
        self.`height` = `height`
        self.`gap` = `gap`
        self.`padding` = `padding`
        self.`direction` = `direction`
        self.`caption` = `caption`
        self.`meta` = `meta`
        self.`status` = `status`
        self.`align` = `align`
        self.`justify` = `justify`
        self.`wrap` = `wrap`
        self.`flex` = `flex`
        self.`minWidth` = `minWidth`
        self.`maxWidth` = `maxWidth`
        self.`minHeight` = `minHeight`
        self.`maxHeight` = `maxHeight`
        self.`aspectRatio` = `aspectRatio`
        self.`background` = `background`
        self.`border` = `border`
        self.`radius` = `radius`
        self.`weight` = `weight`
        self.`textAlign` = `textAlign`
        self.`truncate` = `truncate`
        self.`maxLines` = `maxLines`
        self.`minLines` = `minLines`
        self.`italic` = `italic`
        self.`lineThrough` = `lineThrough`
        self.`limit` = `limit`
        self.`minSize` = `minSize`
        self.`spacing` = `spacing`
        self.`flush` = `flush`
        self.`header` = `header`
        self.`vAlign` = `vAlign`
        self.`colSpan` = `colSpan`
        self.`rowSpan` = `rowSpan`
        self.`colSize` = `colSize`
        self.`fit` = `fit`
        self.`position` = `position`
        self.`frame` = `frame`
        self.`showYAxis` = `showYAxis`
        self.`showLegend` = `showLegend`
        self.`showGrid` = `showGrid`
        self.`variant` = `variant`
        self.`pill` = `pill`
        self.`iconStart` = `iconStart`
        self.`iconEnd` = `iconEnd`
        self.`block` = `block`
        self.`submit` = `submit`
        self.`clearable` = `clearable`
        self.`min` = `min`
        self.`max` = `max`
        self.`step` = `step`
        self.`ariaLabel` = `ariaLabel`
        self.`pattern` = `pattern`
        self.`rows` = `rows`
        self.`maxRows` = `maxRows`
        self.`autoResize` = `autoResize`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `children` = try object.optional("children")
        `title` = try object.optional("title")
        `description` = try object.optional("description")
        `confirm` = try object.optional("confirm")
        `cancel` = try object.optional("cancel")
        `collapsed` = try object.optional("collapsed")
        `value` = try object.optional("value")
        `label` = try object.optional("label")
        `name` = try object.optional("name")
        `fieldName` = try object.optional("fieldName")
        `onClickAction` = try object.optional("onClickAction")
        `onSubmitAction` = try object.optional("onSubmitAction")
        `options` = try object.optional("options")
        `defaultValue` = try object.optional("defaultValue")
        `defaultChecked` = try object.optional("defaultChecked")
        `required` = try object.optional("required")
        `disabled` = try object.optional("disabled")
        `placeholder` = try object.optional("placeholder")
        `inputType` = try object.optional("inputType")
        `data` = try object.optional("data")
        `series` = try object.optional("series")
        `xAxis` = try object.optional("xAxis")
        `src` = try object.optional("src")
        `alt` = try object.optional("alt")
        `size` = try object.optional("size")
        `color` = try object.optional("color")
        `width` = try object.optional("width")
        `height` = try object.optional("height")
        `gap` = try object.optional("gap")
        `padding` = try object.optional("padding")
        `direction` = try object.optional("direction")
        `caption` = try object.optional("caption")
        `meta` = try object.optional("meta")
        `status` = try object.optional("status")
        `align` = try object.optional("align")
        `justify` = try object.optional("justify")
        `wrap` = try object.optional("wrap")
        `flex` = try object.optional("flex")
        `minWidth` = try object.optional("minWidth")
        `maxWidth` = try object.optional("maxWidth")
        `minHeight` = try object.optional("minHeight")
        `maxHeight` = try object.optional("maxHeight")
        `aspectRatio` = try object.optional("aspectRatio")
        `background` = try object.optional("background")
        `border` = try object.optional("border")
        `radius` = try object.optional("radius")
        `weight` = try object.optional("weight")
        `textAlign` = try object.optional("textAlign")
        `truncate` = try object.optional("truncate")
        `maxLines` = try object.optional("maxLines")
        `minLines` = try object.optional("minLines")
        `italic` = try object.optional("italic")
        `lineThrough` = try object.optional("lineThrough")
        `limit` = try object.optional("limit")
        `minSize` = try object.optional("minSize")
        `spacing` = try object.optional("spacing")
        `flush` = try object.optional("flush")
        `header` = try object.optional("header")
        `vAlign` = try object.optional("vAlign")
        `colSpan` = try object.optional("colSpan")
        `rowSpan` = try object.optional("rowSpan")
        `colSize` = try object.optional("colSize")
        `fit` = try object.optional("fit")
        `position` = try object.optional("position")
        `frame` = try object.optional("frame")
        `showYAxis` = try object.optional("showYAxis")
        `showLegend` = try object.optional("showLegend")
        `showGrid` = try object.optional("showGrid")
        `variant` = try object.optional("variant")
        `pill` = try object.optional("pill")
        `iconStart` = try object.optional("iconStart")
        `iconEnd` = try object.optional("iconEnd")
        `block` = try object.optional("block")
        `submit` = try object.optional("submit")
        `clearable` = try object.optional("clearable")
        `min` = try object.optional("min")
        `max` = try object.optional("max")
        `step` = try object.optional("step")
        `ariaLabel` = try object.optional("ariaLabel")
        `pattern` = try object.optional("pattern")
        `rows` = try object.optional("rows")
        `maxRows` = try object.optional("maxRows")
        `autoResize` = try object.optional("autoResize")
        additionalFields = object.remainder(excluding: ["id", "children", "title", "description", "confirm", "cancel", "collapsed", "value", "label", "name", "fieldName", "onClickAction", "onSubmitAction", "options", "defaultValue", "defaultChecked", "required", "disabled", "placeholder", "inputType", "data", "series", "xAxis", "src", "alt", "size", "color", "width", "height", "gap", "padding", "direction", "caption", "meta", "status", "align", "justify", "wrap", "flex", "minWidth", "maxWidth", "minHeight", "maxHeight", "aspectRatio", "background", "border", "radius", "weight", "textAlign", "truncate", "maxLines", "minLines", "italic", "lineThrough", "limit", "minSize", "spacing", "flush", "header", "vAlign", "colSpan", "rowSpan", "colSize", "fit", "position", "frame", "showYAxis", "showLegend", "showGrid", "variant", "pill", "iconStart", "iconEnd", "block", "submit", "clearable", "min", "max", "step", "ariaLabel", "pattern", "rows", "maxRows", "autoResize"])
        explicitNulls = object.nullKeys.intersection(["id", "children", "title", "description", "confirm", "cancel", "collapsed", "value", "label", "name", "fieldName", "onClickAction", "onSubmitAction", "options", "defaultValue", "defaultChecked", "required", "disabled", "placeholder", "inputType", "data", "series", "xAxis", "src", "alt", "size", "color", "width", "height", "gap", "padding", "direction", "caption", "meta", "status", "align", "justify", "wrap", "flex", "minWidth", "maxWidth", "minHeight", "maxHeight", "aspectRatio", "background", "border", "radius", "weight", "textAlign", "truncate", "maxLines", "minLines", "italic", "lineThrough", "limit", "minSize", "spacing", "flush", "header", "vAlign", "colSpan", "rowSpan", "colSize", "fit", "position", "frame", "showYAxis", "showLegend", "showGrid", "variant", "pill", "iconStart", "iconEnd", "block", "submit", "clearable", "min", "max", "step", "ariaLabel", "pattern", "rows", "maxRows", "autoResize"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.putOptional("children", `children`, nulls: explicitNulls)
        try object.putOptional("title", `title`, nulls: explicitNulls)
        try object.putOptional("description", `description`, nulls: explicitNulls)
        try object.putOptional("confirm", `confirm`, nulls: explicitNulls)
        try object.putOptional("cancel", `cancel`, nulls: explicitNulls)
        try object.putOptional("collapsed", `collapsed`, nulls: explicitNulls)
        try object.putOptional("value", `value`, nulls: explicitNulls)
        try object.putOptional("label", `label`, nulls: explicitNulls)
        try object.putOptional("name", `name`, nulls: explicitNulls)
        try object.putOptional("fieldName", `fieldName`, nulls: explicitNulls)
        try object.putOptional("onClickAction", `onClickAction`, nulls: explicitNulls)
        try object.putOptional("onSubmitAction", `onSubmitAction`, nulls: explicitNulls)
        try object.putOptional("options", `options`, nulls: explicitNulls)
        try object.putOptional("defaultValue", `defaultValue`, nulls: explicitNulls)
        try object.putOptional("defaultChecked", `defaultChecked`, nulls: explicitNulls)
        try object.putOptional("required", `required`, nulls: explicitNulls)
        try object.putOptional("disabled", `disabled`, nulls: explicitNulls)
        try object.putOptional("placeholder", `placeholder`, nulls: explicitNulls)
        try object.putOptional("inputType", `inputType`, nulls: explicitNulls)
        try object.putOptional("data", `data`, nulls: explicitNulls)
        try object.putOptional("series", `series`, nulls: explicitNulls)
        try object.putOptional("xAxis", `xAxis`, nulls: explicitNulls)
        try object.putOptional("src", `src`, nulls: explicitNulls)
        try object.putOptional("alt", `alt`, nulls: explicitNulls)
        try object.putOptional("size", `size`, nulls: explicitNulls)
        try object.putOptional("color", `color`, nulls: explicitNulls)
        try object.putOptional("width", `width`, nulls: explicitNulls)
        try object.putOptional("height", `height`, nulls: explicitNulls)
        try object.putOptional("gap", `gap`, nulls: explicitNulls)
        try object.putOptional("padding", `padding`, nulls: explicitNulls)
        try object.putOptional("direction", `direction`, nulls: explicitNulls)
        try object.putOptional("caption", `caption`, nulls: explicitNulls)
        try object.putOptional("meta", `meta`, nulls: explicitNulls)
        try object.putOptional("status", `status`, nulls: explicitNulls)
        try object.putOptional("align", `align`, nulls: explicitNulls)
        try object.putOptional("justify", `justify`, nulls: explicitNulls)
        try object.putOptional("wrap", `wrap`, nulls: explicitNulls)
        try object.putOptional("flex", `flex`, nulls: explicitNulls)
        try object.putOptional("minWidth", `minWidth`, nulls: explicitNulls)
        try object.putOptional("maxWidth", `maxWidth`, nulls: explicitNulls)
        try object.putOptional("minHeight", `minHeight`, nulls: explicitNulls)
        try object.putOptional("maxHeight", `maxHeight`, nulls: explicitNulls)
        try object.putOptional("aspectRatio", `aspectRatio`, nulls: explicitNulls)
        try object.putOptional("background", `background`, nulls: explicitNulls)
        try object.putOptional("border", `border`, nulls: explicitNulls)
        try object.putOptional("radius", `radius`, nulls: explicitNulls)
        try object.putOptional("weight", `weight`, nulls: explicitNulls)
        try object.putOptional("textAlign", `textAlign`, nulls: explicitNulls)
        try object.putOptional("truncate", `truncate`, nulls: explicitNulls)
        try object.putOptional("maxLines", `maxLines`, nulls: explicitNulls)
        try object.putOptional("minLines", `minLines`, nulls: explicitNulls)
        try object.putOptional("italic", `italic`, nulls: explicitNulls)
        try object.putOptional("lineThrough", `lineThrough`, nulls: explicitNulls)
        try object.putOptional("limit", `limit`, nulls: explicitNulls)
        try object.putOptional("minSize", `minSize`, nulls: explicitNulls)
        try object.putOptional("spacing", `spacing`, nulls: explicitNulls)
        try object.putOptional("flush", `flush`, nulls: explicitNulls)
        try object.putOptional("header", `header`, nulls: explicitNulls)
        try object.putOptional("vAlign", `vAlign`, nulls: explicitNulls)
        try object.putOptional("colSpan", `colSpan`, nulls: explicitNulls)
        try object.putOptional("rowSpan", `rowSpan`, nulls: explicitNulls)
        try object.putOptional("colSize", `colSize`, nulls: explicitNulls)
        try object.putOptional("fit", `fit`, nulls: explicitNulls)
        try object.putOptional("position", `position`, nulls: explicitNulls)
        try object.putOptional("frame", `frame`, nulls: explicitNulls)
        try object.putOptional("showYAxis", `showYAxis`, nulls: explicitNulls)
        try object.putOptional("showLegend", `showLegend`, nulls: explicitNulls)
        try object.putOptional("showGrid", `showGrid`, nulls: explicitNulls)
        try object.putOptional("variant", `variant`, nulls: explicitNulls)
        try object.putOptional("pill", `pill`, nulls: explicitNulls)
        try object.putOptional("iconStart", `iconStart`, nulls: explicitNulls)
        try object.putOptional("iconEnd", `iconEnd`, nulls: explicitNulls)
        try object.putOptional("block", `block`, nulls: explicitNulls)
        try object.putOptional("submit", `submit`, nulls: explicitNulls)
        try object.putOptional("clearable", `clearable`, nulls: explicitNulls)
        try object.putOptional("min", `min`, nulls: explicitNulls)
        try object.putOptional("max", `max`, nulls: explicitNulls)
        try object.putOptional("step", `step`, nulls: explicitNulls)
        try object.putOptional("ariaLabel", `ariaLabel`, nulls: explicitNulls)
        try object.putOptional("pattern", `pattern`, nulls: explicitNulls)
        try object.putOptional("rows", `rows`, nulls: explicitNulls)
        try object.putOptional("maxRows", `maxRows`, nulls: explicitNulls)
        try object.putOptional("autoResize", `autoResize`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public indirect enum WidgetNodeFieldsValue: WireModel {
    case string(String)
    case number(Double)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        if let value = try? raw.decode(Double.self) { self = .number(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .string(let value): try value.encode(to: encoder)
        case .number(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public struct WidgetNodeFieldsOptionsElement: WireModel {
    public var `label`: String
    public var `value`: String
    public var `description`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`label`: String, `value`: String, `description`: String? = nil) {
        self.`label` = `label`
        self.`value` = `value`
        self.`description` = `description`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `label` = try object.required("label")
        `value` = try object.required("value")
        `description` = try object.optional("description")
        additionalFields = object.remainder(excluding: ["label", "value", "description"])
        explicitNulls = object.nullKeys.intersection(["label", "value", "description"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("label", `label`)
        try object.put("value", `value`)
        try object.putOptional("description", `description`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public indirect enum WidgetNodeFieldsDefaultValue: WireModel {
    case string(String)
    case bool(Bool)
    case array([String])
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        if let value = try? raw.decode(Bool.self) { self = .bool(value); return }
        if let value = try? raw.decode([String].self) { self = .array(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .string(let value): try value.encode(to: encoder)
        case .bool(let value): try value.encode(to: encoder)
        case .array(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public struct WidgetNodeFieldsXAxis: WireModel {
    public var `dataKey`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`dataKey`: String) {
        self.`dataKey` = `dataKey`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `dataKey` = try object.required("dataKey")
        additionalFields = object.remainder(excluding: ["dataKey"])
        explicitNulls = object.nullKeys.intersection(["dataKey"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("dataKey", `dataKey`)
        try object.encode(to: encoder)
    }
}

public indirect enum WidgetNodeFieldsWidth: WireModel {
    case number(Double)
    case string(String)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(Double.self) { self = .number(value); return }
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .number(let value): try value.encode(to: encoder)
        case .string(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public indirect enum WidgetNodeFieldsHeight: WireModel {
    case number(Double)
    case string(String)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(Double.self) { self = .number(value); return }
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .number(let value): try value.encode(to: encoder)
        case .string(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public struct WidgetNodeFieldsStatus: WireModel {
    public var `text`: String
    public var `icon`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`text`: String, `icon`: String? = nil) {
        self.`text` = `text`
        self.`icon` = `icon`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `text` = try object.required("text")
        `icon` = try object.optional("icon")
        additionalFields = object.remainder(excluding: ["text", "icon"])
        explicitNulls = object.nullKeys.intersection(["text", "icon"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("text", `text`)
        try object.putOptional("icon", `icon`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public indirect enum WidgetNodeFieldsMinWidth: WireModel {
    case number(Double)
    case string(String)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(Double.self) { self = .number(value); return }
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .number(let value): try value.encode(to: encoder)
        case .string(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public indirect enum WidgetNodeFieldsMaxWidth: WireModel {
    case number(Double)
    case string(String)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(Double.self) { self = .number(value); return }
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .number(let value): try value.encode(to: encoder)
        case .string(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public indirect enum WidgetNodeFieldsMinHeight: WireModel {
    case number(Double)
    case string(String)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(Double.self) { self = .number(value); return }
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .number(let value): try value.encode(to: encoder)
        case .string(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public indirect enum WidgetNodeFieldsMaxHeight: WireModel {
    case number(Double)
    case string(String)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(Double.self) { self = .number(value); return }
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .number(let value): try value.encode(to: encoder)
        case .string(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public indirect enum WidgetNodeFieldsMinSize: WireModel {
    case number(Double)
    case string(String)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(Double.self) { self = .number(value); return }
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .number(let value): try value.encode(to: encoder)
        case .string(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

@dynamicMemberLookup
public indirect enum WidgetNode: WireModel {
    case `card`(WidgetNodeFields)
    case `listView`(WidgetNodeFields)
    case `listViewItem`(WidgetNodeFields)
    case `box`(WidgetNodeFields)
    case `row`(WidgetNodeFields)
    case `col`(WidgetNodeFields)
    case `form`(WidgetNodeFields)
    case `spacer`(WidgetNodeFields)
    case `divider`(WidgetNodeFields)
    case `table`(WidgetNodeFields)
    case `tableRow`(WidgetNodeFields)
    case `tableCell`(WidgetNodeFields)
    case `text`(WidgetNodeFields)
    case `title`(WidgetNodeFields)
    case `caption`(WidgetNodeFields)
    case `label`(WidgetNodeFields)
    case `markdown`(WidgetNodeFields)
    case `image`(WidgetNodeFields)
    case `icon`(WidgetNodeFields)
    case `chart`(WidgetNodeFields)
    case `badge`(WidgetNodeFields)
    case `progress`(WidgetNodeFields)
    case `button`(WidgetNodeFields)
    case `select`(WidgetNodeFields)
    case `datePicker`(WidgetNodeFields)
    case `timePicker`(WidgetNodeFields)
    case `dayPicker`(WidgetNodeFields)
    case `checkbox`(WidgetNodeFields)
    case `radioGroup`(WidgetNodeFields)
    case `input`(WidgetNodeFields)
    case `textarea`(WidgetNodeFields)
    case `transition`(WidgetNodeFields)
    case unknown(kind: String, raw: JSONValue)

    public var type: String {
        switch self {
        case .`card`: return "Card"
        case .`listView`: return "ListView"
        case .`listViewItem`: return "ListViewItem"
        case .`box`: return "Box"
        case .`row`: return "Row"
        case .`col`: return "Col"
        case .`form`: return "Form"
        case .`spacer`: return "Spacer"
        case .`divider`: return "Divider"
        case .`table`: return "Table"
        case .`tableRow`: return "Table.Row"
        case .`tableCell`: return "Table.Cell"
        case .`text`: return "Text"
        case .`title`: return "Title"
        case .`caption`: return "Caption"
        case .`label`: return "Label"
        case .`markdown`: return "Markdown"
        case .`image`: return "Image"
        case .`icon`: return "Icon"
        case .`chart`: return "Chart"
        case .`badge`: return "Badge"
        case .`progress`: return "Progress"
        case .`button`: return "Button"
        case .`select`: return "Select"
        case .`datePicker`: return "DatePicker"
        case .`timePicker`: return "TimePicker"
        case .`dayPicker`: return "DayPicker"
        case .`checkbox`: return "Checkbox"
        case .`radioGroup`: return "RadioGroup"
        case .`input`: return "Input"
        case .`textarea`: return "Textarea"
        case .`transition`: return "Transition"
        case .unknown(let kind, _): return kind
        }
    }
    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        guard let kind = raw["type"]?.stringValue else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Missing type"))
        }
        var payload = raw
        payload["type"] = nil
        switch kind {
        case "Card": self = .`card`(try payload.decode(WidgetNodeFields.self))
        case "ListView": self = .`listView`(try payload.decode(WidgetNodeFields.self))
        case "ListViewItem": self = .`listViewItem`(try payload.decode(WidgetNodeFields.self))
        case "Box": self = .`box`(try payload.decode(WidgetNodeFields.self))
        case "Row": self = .`row`(try payload.decode(WidgetNodeFields.self))
        case "Col": self = .`col`(try payload.decode(WidgetNodeFields.self))
        case "Form": self = .`form`(try payload.decode(WidgetNodeFields.self))
        case "Spacer": self = .`spacer`(try payload.decode(WidgetNodeFields.self))
        case "Divider": self = .`divider`(try payload.decode(WidgetNodeFields.self))
        case "Table": self = .`table`(try payload.decode(WidgetNodeFields.self))
        case "Table.Row": self = .`tableRow`(try payload.decode(WidgetNodeFields.self))
        case "Table.Cell": self = .`tableCell`(try payload.decode(WidgetNodeFields.self))
        case "Text": self = .`text`(try payload.decode(WidgetNodeFields.self))
        case "Title": self = .`title`(try payload.decode(WidgetNodeFields.self))
        case "Caption": self = .`caption`(try payload.decode(WidgetNodeFields.self))
        case "Label": self = .`label`(try payload.decode(WidgetNodeFields.self))
        case "Markdown": self = .`markdown`(try payload.decode(WidgetNodeFields.self))
        case "Image": self = .`image`(try payload.decode(WidgetNodeFields.self))
        case "Icon": self = .`icon`(try payload.decode(WidgetNodeFields.self))
        case "Chart": self = .`chart`(try payload.decode(WidgetNodeFields.self))
        case "Badge": self = .`badge`(try payload.decode(WidgetNodeFields.self))
        case "Progress": self = .`progress`(try payload.decode(WidgetNodeFields.self))
        case "Button": self = .`button`(try payload.decode(WidgetNodeFields.self))
        case "Select": self = .`select`(try payload.decode(WidgetNodeFields.self))
        case "DatePicker": self = .`datePicker`(try payload.decode(WidgetNodeFields.self))
        case "TimePicker": self = .`timePicker`(try payload.decode(WidgetNodeFields.self))
        case "DayPicker": self = .`dayPicker`(try payload.decode(WidgetNodeFields.self))
        case "Checkbox": self = .`checkbox`(try payload.decode(WidgetNodeFields.self))
        case "RadioGroup": self = .`radioGroup`(try payload.decode(WidgetNodeFields.self))
        case "Input": self = .`input`(try payload.decode(WidgetNodeFields.self))
        case "Textarea": self = .`textarea`(try payload.decode(WidgetNodeFields.self))
        case "Transition": self = .`transition`(try payload.decode(WidgetNodeFields.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        var raw: JSONValue
        switch self {
        case .`card`(let value): raw = try JSONValue(encoding: value)
        case .`listView`(let value): raw = try JSONValue(encoding: value)
        case .`listViewItem`(let value): raw = try JSONValue(encoding: value)
        case .`box`(let value): raw = try JSONValue(encoding: value)
        case .`row`(let value): raw = try JSONValue(encoding: value)
        case .`col`(let value): raw = try JSONValue(encoding: value)
        case .`form`(let value): raw = try JSONValue(encoding: value)
        case .`spacer`(let value): raw = try JSONValue(encoding: value)
        case .`divider`(let value): raw = try JSONValue(encoding: value)
        case .`table`(let value): raw = try JSONValue(encoding: value)
        case .`tableRow`(let value): raw = try JSONValue(encoding: value)
        case .`tableCell`(let value): raw = try JSONValue(encoding: value)
        case .`text`(let value): raw = try JSONValue(encoding: value)
        case .`title`(let value): raw = try JSONValue(encoding: value)
        case .`caption`(let value): raw = try JSONValue(encoding: value)
        case .`label`(let value): raw = try JSONValue(encoding: value)
        case .`markdown`(let value): raw = try JSONValue(encoding: value)
        case .`image`(let value): raw = try JSONValue(encoding: value)
        case .`icon`(let value): raw = try JSONValue(encoding: value)
        case .`chart`(let value): raw = try JSONValue(encoding: value)
        case .`badge`(let value): raw = try JSONValue(encoding: value)
        case .`progress`(let value): raw = try JSONValue(encoding: value)
        case .`button`(let value): raw = try JSONValue(encoding: value)
        case .`select`(let value): raw = try JSONValue(encoding: value)
        case .`datePicker`(let value): raw = try JSONValue(encoding: value)
        case .`timePicker`(let value): raw = try JSONValue(encoding: value)
        case .`dayPicker`(let value): raw = try JSONValue(encoding: value)
        case .`checkbox`(let value): raw = try JSONValue(encoding: value)
        case .`radioGroup`(let value): raw = try JSONValue(encoding: value)
        case .`input`(let value): raw = try JSONValue(encoding: value)
        case .`textarea`(let value): raw = try JSONValue(encoding: value)
        case .`transition`(let value): raw = try JSONValue(encoding: value)
        case .unknown(_, let value): raw = value
        }
        raw["type"] = .string(type)
        try raw.encode(to: encoder)
    }

    public var fields: WidgetNodeFields? {
        switch self {
        case .`card`(let value): return value
        case .`listView`(let value): return value
        case .`listViewItem`(let value): return value
        case .`box`(let value): return value
        case .`row`(let value): return value
        case .`col`(let value): return value
        case .`form`(let value): return value
        case .`spacer`(let value): return value
        case .`divider`(let value): return value
        case .`table`(let value): return value
        case .`tableRow`(let value): return value
        case .`tableCell`(let value): return value
        case .`text`(let value): return value
        case .`title`(let value): return value
        case .`caption`(let value): return value
        case .`label`(let value): return value
        case .`markdown`(let value): return value
        case .`image`(let value): return value
        case .`icon`(let value): return value
        case .`chart`(let value): return value
        case .`badge`(let value): return value
        case .`progress`(let value): return value
        case .`button`(let value): return value
        case .`select`(let value): return value
        case .`datePicker`(let value): return value
        case .`timePicker`(let value): return value
        case .`dayPicker`(let value): return value
        case .`checkbox`(let value): return value
        case .`radioGroup`(let value): return value
        case .`input`(let value): return value
        case .`textarea`(let value): return value
        case .`transition`(let value): return value
        case .unknown: return nil
        }
    }
    public subscript<T>(dynamicMember keyPath: KeyPath<WidgetNodeFields, T>) -> T? { fields?[keyPath: keyPath] }
    public subscript<T>(dynamicMember keyPath: KeyPath<WidgetNodeFields, T?>) -> T? { fields?[keyPath: keyPath] }
}
