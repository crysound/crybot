import Foundation

public enum EffortLevel: WireModel, Hashable, Sendable {
    case `none`
    case `low`
    case `medium`
    case `high`
    case `xhigh`
    case `max`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "none": self = .`none`
        case "low": self = .`low`
        case "medium": self = .`medium`
        case "high": self = .`high`
        case "xhigh": self = .`xhigh`
        case "max": self = .`max`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`none`: return "none"
        case .`low`: return "low"
        case .`medium`: return "medium"
        case .`high`: return "high"
        case .`xhigh`: return "xhigh"
        case .`max`: return "max"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum BotColor: WireModel, Hashable, Sendable {
    case `green`
    case `blue`
    case `red`
    case `orange`
    case `purple`
    case `cyan`
    case `pink`
    case `yellow`
    case `teal`
    case `coral`
    case `silver`
    case `chrome`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "green": self = .`green`
        case "blue": self = .`blue`
        case "red": self = .`red`
        case "orange": self = .`orange`
        case "purple": self = .`purple`
        case "cyan": self = .`cyan`
        case "pink": self = .`pink`
        case "yellow": self = .`yellow`
        case "teal": self = .`teal`
        case "coral": self = .`coral`
        case "silver": self = .`silver`
        case "chrome": self = .`chrome`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`green`: return "green"
        case .`blue`: return "blue"
        case .`red`: return "red"
        case .`orange`: return "orange"
        case .`purple`: return "purple"
        case .`cyan`: return "cyan"
        case .`pink`: return "pink"
        case .`yellow`: return "yellow"
        case .`teal`: return "teal"
        case .`coral`: return "coral"
        case .`silver`: return "silver"
        case .`chrome`: return "chrome"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct BotsSnapshot: WireModel {
    public var `bots`: [WireBot]
    public var `groups`: [WireGroup]
    public var `sections`: [String]
    public var `botQueuedMessages`: BotQueuedMessages?
    public var `computerControl`: [String: ComputerControlState]?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `bots`: [WireBot],
        `groups`: [WireGroup],
        `sections`: [String],
        `botQueuedMessages`: BotQueuedMessages? = nil,
        `computerControl`: [String: ComputerControlState]? = nil
    ) {
        self.`bots` = `bots`
        self.`groups` = `groups`
        self.`sections` = `sections`
        self.`botQueuedMessages` = `botQueuedMessages`
        self.`computerControl` = `computerControl`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `bots` = try object.required("bots")
        `groups` = try object.required("groups")
        `sections` = try object.required("sections")
        `botQueuedMessages` = try object.optional("botQueuedMessages")
        `computerControl` = try object.optional("computerControl")
        additionalFields = object.remainder(excluding: ["bots", "groups", "sections", "botQueuedMessages", "computerControl"])
        explicitNulls = object.nullKeys.intersection(["bots", "groups", "sections", "botQueuedMessages", "computerControl"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("bots", `bots`)
        try object.put("groups", `groups`)
        try object.put("sections", `sections`)
        try object.putOptional("botQueuedMessages", `botQueuedMessages`, nulls: explicitNulls)
        try object.putOptional("computerControl", `computerControl`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ComputerControlState: WireModel {
    public var `held`: Bool
    public var `helpReason`: String?
    public var `help`: ComputerHelpRef?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`held`: Bool, `helpReason`: String?, `help`: ComputerHelpRef? = nil) {
        self.`held` = `held`
        self.`helpReason` = `helpReason`
        self.`help` = `help`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `held` = try object.required("held")
        `helpReason` = try object.nullable("helpReason")
        `help` = try object.optional("help")
        additionalFields = object.remainder(excluding: ["held", "helpReason", "help"])
        explicitNulls = object.nullKeys.intersection(["held", "helpReason", "help"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("held", `held`)
        try object.putNullable("helpReason", `helpReason`)
        try object.putOptional("help", `help`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ThreadPage: WireModel {
    public var `messages`: [WireMessage]
    public var `hasMore`: Bool?
    public var `activeLeafId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`messages`: [WireMessage], `activeLeafId`: String?, `hasMore`: Bool? = nil) {
        self.`messages` = `messages`
        self.`hasMore` = `hasMore`
        self.`activeLeafId` = `activeLeafId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `messages` = try object.required("messages")
        `hasMore` = try object.optional("hasMore")
        `activeLeafId` = try object.nullable("activeLeafId")
        additionalFields = object.remainder(excluding: ["messages", "hasMore", "activeLeafId"])
        explicitNulls = object.nullKeys.intersection(["messages", "hasMore", "activeLeafId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("messages", `messages`)
        try object.putOptional("hasMore", `hasMore`, nulls: explicitNulls)
        try object.putNullable("activeLeafId", `activeLeafId`)
        try object.encode(to: encoder)
    }
}

public struct SendResponse: WireModel {
    public var `ok`: Bool
    public var `threadId`: String
    public var `queued`: Bool?
    public var `steered`: Bool?
    public var `message`: WireMessage?
    public var `messages`: [WireMessage]?
    public var `queueIds`: [String]?
    public var `queueId`: String?
    public var `reason`: SteerQueueReason?
    public var `why`: String?
    public var `blockedBy`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `ok`: Bool,
        `threadId`: String,
        `queued`: Bool? = nil,
        `steered`: Bool? = nil,
        `message`: WireMessage? = nil,
        `messages`: [WireMessage]? = nil,
        `queueIds`: [String]? = nil,
        `queueId`: String? = nil,
        `reason`: SteerQueueReason? = nil,
        `why`: String? = nil,
        `blockedBy`: String? = nil
    ) {
        self.`ok` = `ok`
        self.`threadId` = `threadId`
        self.`queued` = `queued`
        self.`steered` = `steered`
        self.`message` = `message`
        self.`messages` = `messages`
        self.`queueIds` = `queueIds`
        self.`queueId` = `queueId`
        self.`reason` = `reason`
        self.`why` = `why`
        self.`blockedBy` = `blockedBy`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `ok` = try object.required("ok")
        `threadId` = try object.required("threadId")
        `queued` = try object.optional("queued")
        `steered` = try object.optional("steered")
        `message` = try object.optional("message")
        `messages` = try object.optional("messages")
        `queueIds` = try object.optional("queueIds")
        `queueId` = try object.optional("queueId")
        `reason` = try object.optional("reason")
        `why` = try object.optional("why")
        `blockedBy` = try object.optional("blockedBy")
        additionalFields = object.remainder(excluding: ["ok", "threadId", "queued", "steered", "message", "messages", "queueIds", "queueId", "reason", "why", "blockedBy"])
        explicitNulls = object.nullKeys.intersection(["ok", "threadId", "queued", "steered", "message", "messages", "queueIds", "queueId", "reason", "why", "blockedBy"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("ok", `ok`)
        try object.put("threadId", `threadId`)
        try object.putOptional("queued", `queued`, nulls: explicitNulls)
        try object.putOptional("steered", `steered`, nulls: explicitNulls)
        try object.putOptional("message", `message`, nulls: explicitNulls)
        try object.putOptional("messages", `messages`, nulls: explicitNulls)
        try object.putOptional("queueIds", `queueIds`, nulls: explicitNulls)
        try object.putOptional("queueId", `queueId`, nulls: explicitNulls)
        try object.putOptional("reason", `reason`, nulls: explicitNulls)
        try object.putOptional("why", `why`, nulls: explicitNulls)
        try object.putOptional("blockedBy", `blockedBy`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct InboxPage: WireModel {
    public var `botId`: String?
    public var `threadId`: String?
    public var `rows`: [InboxRow]
    public var `anchor`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String?, `threadId`: String?, `rows`: [InboxRow], `anchor`: String?) {
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`rows` = `rows`
        self.`anchor` = `anchor`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.nullable("botId")
        `threadId` = try object.nullable("threadId")
        `rows` = try object.required("rows")
        `anchor` = try object.nullable("anchor")
        additionalFields = object.remainder(excluding: ["botId", "threadId", "rows", "anchor"])
        explicitNulls = object.nullKeys.intersection(["botId", "threadId", "rows", "anchor"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putNullable("botId", `botId`)
        try object.putNullable("threadId", `threadId`)
        try object.put("rows", `rows`)
        try object.putNullable("anchor", `anchor`)
        try object.encode(to: encoder)
    }
}

public struct InboxCount: WireModel {
    public var `count`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`count`: Double) {
        self.`count` = `count`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `count` = try object.required("count")
        additionalFields = object.remainder(excluding: ["count"])
        explicitNulls = object.nullKeys.intersection(["count"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("count", `count`)
        try object.encode(to: encoder)
    }
}

public struct NotificationsPage: WireModel {
    public var `notifications`: [NotificationLogEntry]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`notifications`: [NotificationLogEntry]) {
        self.`notifications` = `notifications`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `notifications` = try object.required("notifications")
        additionalFields = object.remainder(excluding: ["notifications"])
        explicitNulls = object.nullKeys.intersection(["notifications"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("notifications", `notifications`)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponse: WireModel {
    public var `providerLock`: Bool?
    public var `workspaceBanner`: BannerSummary?
    public var `xai`: SavedKey?
    public var `mistral`: SavedKey?
    public var `cerebras`: SavedKey?
    public var `groq`: SavedKey?
    public var `greenference`: SavedKey?
    public var `modelgo`: SavedKey?
    public var `deepseek`: SavedKey?
    public var `meta`: SavedKey?
    public var `xResearch`: ConfigResponseXResearch?
    public var `treg`: SavedKey?
    public var `postiz`: ConfigResponsePostiz?
    public var `anthropic`: ConfigResponseAnthropic?
    public var `openai`: SavedKey?
    public var `openrouter`: SavedKey?
    public var `openaiCompat`: ConfigResponseOpenaiCompat?
    public var `edition`: ConfigResponseEdition?
    public var `fleet`: ConfigResponseFleet?
    public var `budgets`: ConfigResponseBudgets?
    public var `billing`: ConfigResponseBilling?
    public var `composio`: ConfigResponseComposio
    public var `box`: ConfigResponseBox
    public var `vps`: ConfigResponseVps
    public var `rooms`: ConfigResponseRooms
    public var `mcp`: ConfigResponseMcp?
    public var `newBots`: ConfigResponseNewBots?
    public var `cloudStarter`: Bool?
    public var `botLimit`: Double?
    public var `waitingForRoom`: Bool?
    public var `planTurns`: ConfigResponsePlanTurns?
    public var `awakeLimit`: Double?
    public var `pausedBots`: [String]?
    public var `threads`: ConfigResponseThreads?
    public var `automaticRecovery`: ConfigResponseAutomaticRecovery?
    public var `cacheKeepWarm`: ConfigResponseCacheKeepWarm?
    public var `localVm`: ConfigResponseLocalVm
    public var `opencodeGo`: ConfigResponseOpencodeGo?
    public var `tts`: ConfigResponseTts?
    public var `decider`: ConfigResponseDecider?
    public var `helpers`: ConfigResponseHelpers?
    public var `live`: LiveSettings?
    public var `savedKeys`: ConfigResponseSavedKeys?
    public var `imageGen`: ConfigResponseImageGen?
    public var `profile`: ConfigResponseProfile?
    public var `everyBotRules`: String?
    public var `language`: String?
    public var `computerName`: String?
    public var `features`: ConfigResponseFeatures?
    public var `onboarding`: OnboardingStatus?
    public var `browserEngine`: BrowserEngineSummary?
    public var `browserProfiles`: [BrowserProfile]?
    public var `managedPolicy`: ManagedPolicySummary?
    public var `cloudHome`: Bool?
    public var `team`: ConfigResponseTeam?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `composio`: ConfigResponseComposio,
        `box`: ConfigResponseBox,
        `vps`: ConfigResponseVps,
        `rooms`: ConfigResponseRooms,
        `localVm`: ConfigResponseLocalVm,
        `providerLock`: Bool? = nil,
        `workspaceBanner`: BannerSummary? = nil,
        `xai`: SavedKey? = nil,
        `mistral`: SavedKey? = nil,
        `cerebras`: SavedKey? = nil,
        `groq`: SavedKey? = nil,
        `greenference`: SavedKey? = nil,
        `modelgo`: SavedKey? = nil,
        `deepseek`: SavedKey? = nil,
        `meta`: SavedKey? = nil,
        `xResearch`: ConfigResponseXResearch? = nil,
        `treg`: SavedKey? = nil,
        `postiz`: ConfigResponsePostiz? = nil,
        `anthropic`: ConfigResponseAnthropic? = nil,
        `openai`: SavedKey? = nil,
        `openrouter`: SavedKey? = nil,
        `openaiCompat`: ConfigResponseOpenaiCompat? = nil,
        `edition`: ConfigResponseEdition? = nil,
        `fleet`: ConfigResponseFleet? = nil,
        `budgets`: ConfigResponseBudgets? = nil,
        `billing`: ConfigResponseBilling? = nil,
        `mcp`: ConfigResponseMcp? = nil,
        `newBots`: ConfigResponseNewBots? = nil,
        `cloudStarter`: Bool? = nil,
        `botLimit`: Double? = nil,
        `waitingForRoom`: Bool? = nil,
        `planTurns`: ConfigResponsePlanTurns? = nil,
        `awakeLimit`: Double? = nil,
        `pausedBots`: [String]? = nil,
        `threads`: ConfigResponseThreads? = nil,
        `automaticRecovery`: ConfigResponseAutomaticRecovery? = nil,
        `cacheKeepWarm`: ConfigResponseCacheKeepWarm? = nil,
        `opencodeGo`: ConfigResponseOpencodeGo? = nil,
        `tts`: ConfigResponseTts? = nil,
        `decider`: ConfigResponseDecider? = nil,
        `helpers`: ConfigResponseHelpers? = nil,
        `live`: LiveSettings? = nil,
        `savedKeys`: ConfigResponseSavedKeys? = nil,
        `imageGen`: ConfigResponseImageGen? = nil,
        `profile`: ConfigResponseProfile? = nil,
        `everyBotRules`: String? = nil,
        `language`: String? = nil,
        `computerName`: String? = nil,
        `features`: ConfigResponseFeatures? = nil,
        `onboarding`: OnboardingStatus? = nil,
        `browserEngine`: BrowserEngineSummary? = nil,
        `browserProfiles`: [BrowserProfile]? = nil,
        `managedPolicy`: ManagedPolicySummary? = nil,
        `cloudHome`: Bool? = nil,
        `team`: ConfigResponseTeam? = nil
    ) {
        self.`providerLock` = `providerLock`
        self.`workspaceBanner` = `workspaceBanner`
        self.`xai` = `xai`
        self.`mistral` = `mistral`
        self.`cerebras` = `cerebras`
        self.`groq` = `groq`
        self.`greenference` = `greenference`
        self.`modelgo` = `modelgo`
        self.`deepseek` = `deepseek`
        self.`meta` = `meta`
        self.`xResearch` = `xResearch`
        self.`treg` = `treg`
        self.`postiz` = `postiz`
        self.`anthropic` = `anthropic`
        self.`openai` = `openai`
        self.`openrouter` = `openrouter`
        self.`openaiCompat` = `openaiCompat`
        self.`edition` = `edition`
        self.`fleet` = `fleet`
        self.`budgets` = `budgets`
        self.`billing` = `billing`
        self.`composio` = `composio`
        self.`box` = `box`
        self.`vps` = `vps`
        self.`rooms` = `rooms`
        self.`mcp` = `mcp`
        self.`newBots` = `newBots`
        self.`cloudStarter` = `cloudStarter`
        self.`botLimit` = `botLimit`
        self.`waitingForRoom` = `waitingForRoom`
        self.`planTurns` = `planTurns`
        self.`awakeLimit` = `awakeLimit`
        self.`pausedBots` = `pausedBots`
        self.`threads` = `threads`
        self.`automaticRecovery` = `automaticRecovery`
        self.`cacheKeepWarm` = `cacheKeepWarm`
        self.`localVm` = `localVm`
        self.`opencodeGo` = `opencodeGo`
        self.`tts` = `tts`
        self.`decider` = `decider`
        self.`helpers` = `helpers`
        self.`live` = `live`
        self.`savedKeys` = `savedKeys`
        self.`imageGen` = `imageGen`
        self.`profile` = `profile`
        self.`everyBotRules` = `everyBotRules`
        self.`language` = `language`
        self.`computerName` = `computerName`
        self.`features` = `features`
        self.`onboarding` = `onboarding`
        self.`browserEngine` = `browserEngine`
        self.`browserProfiles` = `browserProfiles`
        self.`managedPolicy` = `managedPolicy`
        self.`cloudHome` = `cloudHome`
        self.`team` = `team`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `providerLock` = try object.optional("providerLock")
        `workspaceBanner` = try object.optional("workspaceBanner")
        `xai` = try object.optional("xai")
        `mistral` = try object.optional("mistral")
        `cerebras` = try object.optional("cerebras")
        `groq` = try object.optional("groq")
        `greenference` = try object.optional("greenference")
        `modelgo` = try object.optional("modelgo")
        `deepseek` = try object.optional("deepseek")
        `meta` = try object.optional("meta")
        `xResearch` = try object.optional("xResearch")
        `treg` = try object.optional("treg")
        `postiz` = try object.optional("postiz")
        `anthropic` = try object.optional("anthropic")
        `openai` = try object.optional("openai")
        `openrouter` = try object.optional("openrouter")
        `openaiCompat` = try object.optional("openaiCompat")
        `edition` = try object.optional("edition")
        `fleet` = try object.optional("fleet")
        `budgets` = try object.optional("budgets")
        `billing` = try object.optional("billing")
        `composio` = try object.required("composio")
        `box` = try object.required("box")
        `vps` = try object.required("vps")
        `rooms` = try object.required("rooms")
        `mcp` = try object.optional("mcp")
        `newBots` = try object.optional("newBots")
        `cloudStarter` = try object.optional("cloudStarter")
        `botLimit` = try object.optional("botLimit")
        `waitingForRoom` = try object.optional("waitingForRoom")
        `planTurns` = try object.optional("planTurns")
        `awakeLimit` = try object.optional("awakeLimit")
        `pausedBots` = try object.optional("pausedBots")
        `threads` = try object.optional("threads")
        `automaticRecovery` = try object.optional("automaticRecovery")
        `cacheKeepWarm` = try object.optional("cacheKeepWarm")
        `localVm` = try object.required("localVm")
        `opencodeGo` = try object.optional("opencodeGo")
        `tts` = try object.optional("tts")
        `decider` = try object.optional("decider")
        `helpers` = try object.optional("helpers")
        `live` = try object.optional("live")
        `savedKeys` = try object.optional("savedKeys")
        `imageGen` = try object.optional("imageGen")
        `profile` = try object.optional("profile")
        `everyBotRules` = try object.optional("everyBotRules")
        `language` = try object.optional("language")
        `computerName` = try object.optional("computerName")
        `features` = try object.optional("features")
        `onboarding` = try object.optional("onboarding")
        `browserEngine` = try object.optional("browserEngine")
        `browserProfiles` = try object.optional("browserProfiles")
        `managedPolicy` = try object.optional("managedPolicy")
        `cloudHome` = try object.optional("cloudHome")
        `team` = try object.optional("team")
        additionalFields = object.remainder(excluding: ["providerLock", "workspaceBanner", "xai", "mistral", "cerebras", "groq", "greenference", "modelgo", "deepseek", "meta", "xResearch", "treg", "postiz", "anthropic", "openai", "openrouter", "openaiCompat", "edition", "fleet", "budgets", "billing", "composio", "box", "vps", "rooms", "mcp", "newBots", "cloudStarter", "botLimit", "waitingForRoom", "planTurns", "awakeLimit", "pausedBots", "threads", "automaticRecovery", "cacheKeepWarm", "localVm", "opencodeGo", "tts", "decider", "helpers", "live", "savedKeys", "imageGen", "profile", "everyBotRules", "language", "computerName", "features", "onboarding", "browserEngine", "browserProfiles", "managedPolicy", "cloudHome", "team"])
        explicitNulls = object.nullKeys.intersection(["providerLock", "workspaceBanner", "xai", "mistral", "cerebras", "groq", "greenference", "modelgo", "deepseek", "meta", "xResearch", "treg", "postiz", "anthropic", "openai", "openrouter", "openaiCompat", "edition", "fleet", "budgets", "billing", "composio", "box", "vps", "rooms", "mcp", "newBots", "cloudStarter", "botLimit", "waitingForRoom", "planTurns", "awakeLimit", "pausedBots", "threads", "automaticRecovery", "cacheKeepWarm", "localVm", "opencodeGo", "tts", "decider", "helpers", "live", "savedKeys", "imageGen", "profile", "everyBotRules", "language", "computerName", "features", "onboarding", "browserEngine", "browserProfiles", "managedPolicy", "cloudHome", "team"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("providerLock", `providerLock`, nulls: explicitNulls)
        try object.putOptional("workspaceBanner", `workspaceBanner`, nulls: explicitNulls)
        try object.putOptional("xai", `xai`, nulls: explicitNulls)
        try object.putOptional("mistral", `mistral`, nulls: explicitNulls)
        try object.putOptional("cerebras", `cerebras`, nulls: explicitNulls)
        try object.putOptional("groq", `groq`, nulls: explicitNulls)
        try object.putOptional("greenference", `greenference`, nulls: explicitNulls)
        try object.putOptional("modelgo", `modelgo`, nulls: explicitNulls)
        try object.putOptional("deepseek", `deepseek`, nulls: explicitNulls)
        try object.putOptional("meta", `meta`, nulls: explicitNulls)
        try object.putOptional("xResearch", `xResearch`, nulls: explicitNulls)
        try object.putOptional("treg", `treg`, nulls: explicitNulls)
        try object.putOptional("postiz", `postiz`, nulls: explicitNulls)
        try object.putOptional("anthropic", `anthropic`, nulls: explicitNulls)
        try object.putOptional("openai", `openai`, nulls: explicitNulls)
        try object.putOptional("openrouter", `openrouter`, nulls: explicitNulls)
        try object.putOptional("openaiCompat", `openaiCompat`, nulls: explicitNulls)
        try object.putOptional("edition", `edition`, nulls: explicitNulls)
        try object.putOptional("fleet", `fleet`, nulls: explicitNulls)
        try object.putOptional("budgets", `budgets`, nulls: explicitNulls)
        try object.putOptional("billing", `billing`, nulls: explicitNulls)
        try object.put("composio", `composio`)
        try object.put("box", `box`)
        try object.put("vps", `vps`)
        try object.put("rooms", `rooms`)
        try object.putOptional("mcp", `mcp`, nulls: explicitNulls)
        try object.putOptional("newBots", `newBots`, nulls: explicitNulls)
        try object.putOptional("cloudStarter", `cloudStarter`, nulls: explicitNulls)
        try object.putOptional("botLimit", `botLimit`, nulls: explicitNulls)
        try object.putOptional("waitingForRoom", `waitingForRoom`, nulls: explicitNulls)
        try object.putOptional("planTurns", `planTurns`, nulls: explicitNulls)
        try object.putOptional("awakeLimit", `awakeLimit`, nulls: explicitNulls)
        try object.putOptional("pausedBots", `pausedBots`, nulls: explicitNulls)
        try object.putOptional("threads", `threads`, nulls: explicitNulls)
        try object.putOptional("automaticRecovery", `automaticRecovery`, nulls: explicitNulls)
        try object.putOptional("cacheKeepWarm", `cacheKeepWarm`, nulls: explicitNulls)
        try object.put("localVm", `localVm`)
        try object.putOptional("opencodeGo", `opencodeGo`, nulls: explicitNulls)
        try object.putOptional("tts", `tts`, nulls: explicitNulls)
        try object.putOptional("decider", `decider`, nulls: explicitNulls)
        try object.putOptional("helpers", `helpers`, nulls: explicitNulls)
        try object.putOptional("live", `live`, nulls: explicitNulls)
        try object.putOptional("savedKeys", `savedKeys`, nulls: explicitNulls)
        try object.putOptional("imageGen", `imageGen`, nulls: explicitNulls)
        try object.putOptional("profile", `profile`, nulls: explicitNulls)
        try object.putOptional("everyBotRules", `everyBotRules`, nulls: explicitNulls)
        try object.putOptional("language", `language`, nulls: explicitNulls)
        try object.putOptional("computerName", `computerName`, nulls: explicitNulls)
        try object.putOptional("features", `features`, nulls: explicitNulls)
        try object.putOptional("onboarding", `onboarding`, nulls: explicitNulls)
        try object.putOptional("browserEngine", `browserEngine`, nulls: explicitNulls)
        try object.putOptional("browserProfiles", `browserProfiles`, nulls: explicitNulls)
        try object.putOptional("managedPolicy", `managedPolicy`, nulls: explicitNulls)
        try object.putOptional("cloudHome", `cloudHome`, nulls: explicitNulls)
        try object.putOptional("team", `team`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseXResearch: WireModel {
    public var `included`: Bool
    public var `unavailable`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`included`: Bool, `unavailable`: Bool? = nil) {
        self.`included` = `included`
        self.`unavailable` = `unavailable`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `included` = try object.required("included")
        `unavailable` = try object.optional("unavailable")
        additionalFields = object.remainder(excluding: ["included", "unavailable"])
        explicitNulls = object.nullKeys.intersection(["included", "unavailable"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("included", `included`)
        try object.putOptional("unavailable", `unavailable`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponsePostiz: WireModel {
    public var `configured`: Bool
    public var `last4`: String?
    public var `url`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`configured`: Bool, `last4`: String? = nil, `url`: String? = nil) {
        self.`configured` = `configured`
        self.`last4` = `last4`
        self.`url` = `url`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `configured` = try object.required("configured")
        `last4` = try object.optional("last4")
        `url` = try object.optional("url")
        additionalFields = object.remainder(excluding: ["configured", "last4", "url"])
        explicitNulls = object.nullKeys.intersection(["configured", "last4", "url"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("configured", `configured`)
        try object.putOptional("last4", `last4`, nulls: explicitNulls)
        try object.putOptional("url", `url`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseAnthropic: WireModel {
    public var `configured`: Bool
    public var `last4`: String?
    public var `everyClaudeBot`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`configured`: Bool, `last4`: String? = nil, `everyClaudeBot`: Bool? = nil) {
        self.`configured` = `configured`
        self.`last4` = `last4`
        self.`everyClaudeBot` = `everyClaudeBot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `configured` = try object.required("configured")
        `last4` = try object.optional("last4")
        `everyClaudeBot` = try object.optional("everyClaudeBot")
        additionalFields = object.remainder(excluding: ["configured", "last4", "everyClaudeBot"])
        explicitNulls = object.nullKeys.intersection(["configured", "last4", "everyClaudeBot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("configured", `configured`)
        try object.putOptional("last4", `last4`, nulls: explicitNulls)
        try object.putOptional("everyClaudeBot", `everyClaudeBot`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseOpenaiCompat: WireModel {
    public var `configured`: Bool
    public var `last4`: String?
    public var `url`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`configured`: Bool, `last4`: String? = nil, `url`: String? = nil) {
        self.`configured` = `configured`
        self.`last4` = `last4`
        self.`url` = `url`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `configured` = try object.required("configured")
        `last4` = try object.optional("last4")
        `url` = try object.optional("url")
        additionalFields = object.remainder(excluding: ["configured", "last4", "url"])
        explicitNulls = object.nullKeys.intersection(["configured", "last4", "url"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("configured", `configured`)
        try object.putOptional("last4", `last4`, nulls: explicitNulls)
        try object.putOptional("url", `url`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseEdition: WireModel {
    public var `edition`: ConfigResponseEditionEdition
    public var `features`: [String]
    public var `license`: ConfigResponseEditionLicense?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`edition`: ConfigResponseEditionEdition, `features`: [String], `license`: ConfigResponseEditionLicense? = nil) {
        self.`edition` = `edition`
        self.`features` = `features`
        self.`license` = `license`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `edition` = try object.required("edition")
        `features` = try object.required("features")
        `license` = try object.optional("license")
        additionalFields = object.remainder(excluding: ["edition", "features", "license"])
        explicitNulls = object.nullKeys.intersection(["edition", "features", "license"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("edition", `edition`)
        try object.put("features", `features`)
        try object.putOptional("license", `license`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum ConfigResponseEditionEdition: WireModel, Hashable, Sendable {
    case `oss`
    case `enterprise`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "oss": self = .`oss`
        case "enterprise": self = .`enterprise`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`oss`: return "oss"
        case .`enterprise`: return "enterprise"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ConfigResponseEditionLicense: WireModel {
    public var `expiresAt`: String
    public var `expiresInDays`: Double
    public var `graceEndsAt`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`expiresAt`: String, `expiresInDays`: Double, `graceEndsAt`: String? = nil) {
        self.`expiresAt` = `expiresAt`
        self.`expiresInDays` = `expiresInDays`
        self.`graceEndsAt` = `graceEndsAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `expiresAt` = try object.required("expiresAt")
        `expiresInDays` = try object.required("expiresInDays")
        `graceEndsAt` = try object.optional("graceEndsAt")
        additionalFields = object.remainder(excluding: ["expiresAt", "expiresInDays", "graceEndsAt"])
        explicitNulls = object.nullKeys.intersection(["expiresAt", "expiresInDays", "graceEndsAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("expiresAt", `expiresAt`)
        try object.put("expiresInDays", `expiresInDays`)
        try object.putOptional("graceEndsAt", `graceEndsAt`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseFleet: WireModel {
    public var `available`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`available`: Bool) {
        self.`available` = `available`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `available` = try object.required("available")
        additionalFields = object.remainder(excluding: ["available"])
        explicitNulls = object.nullKeys.intersection(["available"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("available", `available`)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseBudgets: WireModel {
    public var `monthlyUsd`: Double?
    public var `warnAtPercent`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`monthlyUsd`: Double? = nil, `warnAtPercent`: Double? = nil) {
        self.`monthlyUsd` = `monthlyUsd`
        self.`warnAtPercent` = `warnAtPercent`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `monthlyUsd` = try object.optional("monthlyUsd")
        `warnAtPercent` = try object.optional("warnAtPercent")
        additionalFields = object.remainder(excluding: ["monthlyUsd", "warnAtPercent"])
        explicitNulls = object.nullKeys.intersection(["monthlyUsd", "warnAtPercent"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("monthlyUsd", `monthlyUsd`, nulls: explicitNulls)
        try object.putOptional("warnAtPercent", `warnAtPercent`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseBilling: WireModel {
    public var `currency`: String?
    public var `prices`: [String: ConfigResponseBillingPricesValue]?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`currency`: String? = nil, `prices`: [String: ConfigResponseBillingPricesValue]? = nil) {
        self.`currency` = `currency`
        self.`prices` = `prices`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `currency` = try object.optional("currency")
        `prices` = try object.optional("prices")
        additionalFields = object.remainder(excluding: ["currency", "prices"])
        explicitNulls = object.nullKeys.intersection(["currency", "prices"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("currency", `currency`, nulls: explicitNulls)
        try object.putOptional("prices", `prices`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseBillingPricesValue: WireModel {
    public var `inputPerMillion`: Double
    public var `outputPerMillion`: Double
    public var `cachedInputPerMillion`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`inputPerMillion`: Double, `outputPerMillion`: Double, `cachedInputPerMillion`: Double? = nil) {
        self.`inputPerMillion` = `inputPerMillion`
        self.`outputPerMillion` = `outputPerMillion`
        self.`cachedInputPerMillion` = `cachedInputPerMillion`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `inputPerMillion` = try object.required("inputPerMillion")
        `outputPerMillion` = try object.required("outputPerMillion")
        `cachedInputPerMillion` = try object.optional("cachedInputPerMillion")
        additionalFields = object.remainder(excluding: ["inputPerMillion", "outputPerMillion", "cachedInputPerMillion"])
        explicitNulls = object.nullKeys.intersection(["inputPerMillion", "outputPerMillion", "cachedInputPerMillion"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("inputPerMillion", `inputPerMillion`)
        try object.put("outputPerMillion", `outputPerMillion`)
        try object.putOptional("cachedInputPerMillion", `cachedInputPerMillion`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseComposio: WireModel {
    public var `configured`: Bool
    public var `last4`: String?
    public var `mode`: ConfigResponseComposioMode?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`configured`: Bool, `last4`: String? = nil, `mode`: ConfigResponseComposioMode? = nil) {
        self.`configured` = `configured`
        self.`last4` = `last4`
        self.`mode` = `mode`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `configured` = try object.required("configured")
        `last4` = try object.optional("last4")
        `mode` = try object.optional("mode")
        additionalFields = object.remainder(excluding: ["configured", "last4", "mode"])
        explicitNulls = object.nullKeys.intersection(["configured", "last4", "mode"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("configured", `configured`)
        try object.putOptional("last4", `last4`, nulls: explicitNulls)
        try object.putOptional("mode", `mode`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum ConfigResponseComposioMode: WireModel, Hashable, Sendable {
    case `managed`
    case `selfHosted`
    case `unavailable`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "managed": self = .`managed`
        case "self-hosted": self = .`selfHosted`
        case "unavailable": self = .`unavailable`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`managed`: return "managed"
        case .`selfHosted`: return "self-hosted"
        case .`unavailable`: return "unavailable"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ConfigResponseBox: WireModel {
    public var `configured`: Bool
    public var `last4`: String?
    public var `included`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`configured`: Bool, `last4`: String? = nil, `included`: Bool? = nil) {
        self.`configured` = `configured`
        self.`last4` = `last4`
        self.`included` = `included`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `configured` = try object.required("configured")
        `last4` = try object.optional("last4")
        `included` = try object.optional("included")
        additionalFields = object.remainder(excluding: ["configured", "last4", "included"])
        explicitNulls = object.nullKeys.intersection(["configured", "last4", "included"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("configured", `configured`)
        try object.putOptional("last4", `last4`, nulls: explicitNulls)
        try object.putOptional("included", `included`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseVps: WireModel {
    public var `configured`: Bool
    public var `sshAlias`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`configured`: Bool, `sshAlias`: String) {
        self.`configured` = `configured`
        self.`sshAlias` = `sshAlias`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `configured` = try object.required("configured")
        `sshAlias` = try object.required("sshAlias")
        additionalFields = object.remainder(excluding: ["configured", "sshAlias"])
        explicitNulls = object.nullKeys.intersection(["configured", "sshAlias"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("configured", `configured`)
        try object.put("sshAlias", `sshAlias`)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseRooms: WireModel {
    public var `turnTimeoutMinutes`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`turnTimeoutMinutes`: Double) {
        self.`turnTimeoutMinutes` = `turnTimeoutMinutes`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `turnTimeoutMinutes` = try object.required("turnTimeoutMinutes")
        additionalFields = object.remainder(excluding: ["turnTimeoutMinutes"])
        explicitNulls = object.nullKeys.intersection(["turnTimeoutMinutes"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("turnTimeoutMinutes", `turnTimeoutMinutes`)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseMcp: WireModel {
    public var `callTimeoutMinutes`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`callTimeoutMinutes`: Double) {
        self.`callTimeoutMinutes` = `callTimeoutMinutes`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `callTimeoutMinutes` = try object.required("callTimeoutMinutes")
        additionalFields = object.remainder(excluding: ["callTimeoutMinutes"])
        explicitNulls = object.nullKeys.intersection(["callTimeoutMinutes"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("callTimeoutMinutes", `callTimeoutMinutes`)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseNewBots: WireModel {
    public var `effort`: EffortLevel?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`effort`: EffortLevel? = nil) {
        self.`effort` = `effort`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `effort` = try object.optional("effort")
        additionalFields = object.remainder(excluding: ["effort"])
        explicitNulls = object.nullKeys.intersection(["effort"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("effort", `effort`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponsePlanTurns: WireModel {
    public var `running`: Double
    public var `waiting`: Double
    public var `refusedAt`: Double?
    public var `refused`: ConfigResponsePlanTurnsRefused?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`running`: Double, `waiting`: Double, `refusedAt`: Double? = nil, `refused`: ConfigResponsePlanTurnsRefused? = nil) {
        self.`running` = `running`
        self.`waiting` = `waiting`
        self.`refusedAt` = `refusedAt`
        self.`refused` = `refused`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `running` = try object.required("running")
        `waiting` = try object.required("waiting")
        `refusedAt` = try object.optional("refusedAt")
        `refused` = try object.optional("refused")
        additionalFields = object.remainder(excluding: ["running", "waiting", "refusedAt", "refused"])
        explicitNulls = object.nullKeys.intersection(["running", "waiting", "refusedAt", "refused"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("running", `running`)
        try object.put("waiting", `waiting`)
        try object.putOptional("refusedAt", `refusedAt`, nulls: explicitNulls)
        try object.putOptional("refused", `refused`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum ConfigResponsePlanTurnsRefused: WireModel, Hashable, Sendable {
    case `tasks`
    case `paused`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "tasks": self = .`tasks`
        case "paused": self = .`paused`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`tasks`: return "tasks"
        case .`paused`: return "paused"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ConfigResponseThreads: WireModel {
    public var `maxConcurrentPerBot`: Double
    public var `eventLogMaxBytes`: Double?
    public var `eventLogRetentionDays`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`maxConcurrentPerBot`: Double, `eventLogMaxBytes`: Double? = nil, `eventLogRetentionDays`: Double? = nil) {
        self.`maxConcurrentPerBot` = `maxConcurrentPerBot`
        self.`eventLogMaxBytes` = `eventLogMaxBytes`
        self.`eventLogRetentionDays` = `eventLogRetentionDays`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `maxConcurrentPerBot` = try object.required("maxConcurrentPerBot")
        `eventLogMaxBytes` = try object.optional("eventLogMaxBytes")
        `eventLogRetentionDays` = try object.optional("eventLogRetentionDays")
        additionalFields = object.remainder(excluding: ["maxConcurrentPerBot", "eventLogMaxBytes", "eventLogRetentionDays"])
        explicitNulls = object.nullKeys.intersection(["maxConcurrentPerBot", "eventLogMaxBytes", "eventLogRetentionDays"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("maxConcurrentPerBot", `maxConcurrentPerBot`)
        try object.putOptional("eventLogMaxBytes", `eventLogMaxBytes`, nulls: explicitNulls)
        try object.putOptional("eventLogRetentionDays", `eventLogRetentionDays`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseAutomaticRecovery: WireModel {
    public var `enabled`: Bool
    public var `backup`: ModelSelection?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`enabled`: Bool, `backup`: ModelSelection? = nil) {
        self.`enabled` = `enabled`
        self.`backup` = `backup`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `enabled` = try object.required("enabled")
        `backup` = try object.optional("backup")
        additionalFields = object.remainder(excluding: ["enabled", "backup"])
        explicitNulls = object.nullKeys.intersection(["enabled", "backup"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("enabled", `enabled`)
        try object.putOptional("backup", `backup`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseCacheKeepWarm: WireModel {
    public var `enabled`: Bool
    public var `windowMinutes`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`enabled`: Bool, `windowMinutes`: Double) {
        self.`enabled` = `enabled`
        self.`windowMinutes` = `windowMinutes`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `enabled` = try object.required("enabled")
        `windowMinutes` = try object.required("windowMinutes")
        additionalFields = object.remainder(excluding: ["enabled", "windowMinutes"])
        explicitNulls = object.nullKeys.intersection(["enabled", "windowMinutes"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("enabled", `enabled`)
        try object.put("windowMinutes", `windowMinutes`)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseLocalVm: WireModel {
    public var `mode`: ConfigResponseLocalVmMode
    public var `maxInstances`: Double
    public var `idleTimeoutMinutes`: Double?
    public var `preserveInstalledApps`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`mode`: ConfigResponseLocalVmMode, `maxInstances`: Double, `idleTimeoutMinutes`: Double? = nil, `preserveInstalledApps`: Bool? = nil) {
        self.`mode` = `mode`
        self.`maxInstances` = `maxInstances`
        self.`idleTimeoutMinutes` = `idleTimeoutMinutes`
        self.`preserveInstalledApps` = `preserveInstalledApps`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `mode` = try object.required("mode")
        `maxInstances` = try object.required("maxInstances")
        `idleTimeoutMinutes` = try object.optional("idleTimeoutMinutes")
        `preserveInstalledApps` = try object.optional("preserveInstalledApps")
        additionalFields = object.remainder(excluding: ["mode", "maxInstances", "idleTimeoutMinutes", "preserveInstalledApps"])
        explicitNulls = object.nullKeys.intersection(["mode", "maxInstances", "idleTimeoutMinutes", "preserveInstalledApps"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("mode", `mode`)
        try object.put("maxInstances", `maxInstances`)
        try object.putOptional("idleTimeoutMinutes", `idleTimeoutMinutes`, nulls: explicitNulls)
        try object.putOptional("preserveInstalledApps", `preserveInstalledApps`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum ConfigResponseLocalVmMode: WireModel, Hashable, Sendable {
    case `shared`
    case `perBot`
    case `pool`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "shared": self = .`shared`
        case "per-bot": self = .`perBot`
        case "pool": self = .`pool`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`shared`: return "shared"
        case .`perBot`: return "per-bot"
        case .`pool`: return "pool"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ConfigResponseOpencodeGo: WireModel {
    public var `configured`: Bool
    public var `last4`: String?
    public var `providerKeys`: [String]?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`configured`: Bool, `last4`: String? = nil, `providerKeys`: [String]? = nil) {
        self.`configured` = `configured`
        self.`last4` = `last4`
        self.`providerKeys` = `providerKeys`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `configured` = try object.required("configured")
        `last4` = try object.optional("last4")
        `providerKeys` = try object.optional("providerKeys")
        additionalFields = object.remainder(excluding: ["configured", "last4", "providerKeys"])
        explicitNulls = object.nullKeys.intersection(["configured", "last4", "providerKeys"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("configured", `configured`)
        try object.putOptional("last4", `last4`, nulls: explicitNulls)
        try object.putOptional("providerKeys", `providerKeys`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseTts: WireModel {
    public var `configured`: Bool
    public var `ready`: Bool
    public var `voice`: String
    public var `provider`: ConfigResponseTtsProvider?
    public var `baseUrl`: String?
    public var `model`: String?
    public var `everyReply`: Bool?
    public var `fishModel`: ConfigResponseTtsFishModel?
    public var `included`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `configured`: Bool,
        `ready`: Bool,
        `voice`: String,
        `provider`: ConfigResponseTtsProvider? = nil,
        `baseUrl`: String? = nil,
        `model`: String? = nil,
        `everyReply`: Bool? = nil,
        `fishModel`: ConfigResponseTtsFishModel? = nil,
        `included`: Bool? = nil
    ) {
        self.`configured` = `configured`
        self.`ready` = `ready`
        self.`voice` = `voice`
        self.`provider` = `provider`
        self.`baseUrl` = `baseUrl`
        self.`model` = `model`
        self.`everyReply` = `everyReply`
        self.`fishModel` = `fishModel`
        self.`included` = `included`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `configured` = try object.required("configured")
        `ready` = try object.required("ready")
        `voice` = try object.required("voice")
        `provider` = try object.optional("provider")
        `baseUrl` = try object.optional("baseUrl")
        `model` = try object.optional("model")
        `everyReply` = try object.optional("everyReply")
        `fishModel` = try object.optional("fishModel")
        `included` = try object.optional("included")
        additionalFields = object.remainder(excluding: ["configured", "ready", "voice", "provider", "baseUrl", "model", "everyReply", "fishModel", "included"])
        explicitNulls = object.nullKeys.intersection(["configured", "ready", "voice", "provider", "baseUrl", "model", "everyReply", "fishModel", "included"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("configured", `configured`)
        try object.put("ready", `ready`)
        try object.put("voice", `voice`)
        try object.putOptional("provider", `provider`, nulls: explicitNulls)
        try object.putOptional("baseUrl", `baseUrl`, nulls: explicitNulls)
        try object.putOptional("model", `model`, nulls: explicitNulls)
        try object.putOptional("everyReply", `everyReply`, nulls: explicitNulls)
        try object.putOptional("fishModel", `fishModel`, nulls: explicitNulls)
        try object.putOptional("included", `included`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum ConfigResponseTtsProvider: WireModel, Hashable, Sendable {
    case `elevenlabs`
    case `fish`
    case `system`
    case `chatterbox`
    case `xai`
    case `gemini`
    case `openai`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "elevenlabs": self = .`elevenlabs`
        case "fish": self = .`fish`
        case "system": self = .`system`
        case "chatterbox": self = .`chatterbox`
        case "xai": self = .`xai`
        case "gemini": self = .`gemini`
        case "openai": self = .`openai`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`elevenlabs`: return "elevenlabs"
        case .`fish`: return "fish"
        case .`system`: return "system"
        case .`chatterbox`: return "chatterbox"
        case .`xai`: return "xai"
        case .`gemini`: return "gemini"
        case .`openai`: return "openai"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum ConfigResponseTtsFishModel: WireModel, Hashable, Sendable {
    case `s21Pro`
    case `s21ProFree`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "s2.1-pro": self = .`s21Pro`
        case "s2.1-pro-free": self = .`s21ProFree`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`s21Pro`: return "s2.1-pro"
        case .`s21ProFree`: return "s2.1-pro-free"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ConfigResponseDecider: WireModel {
    public var `provider`: ConfigResponseDeciderProvider
    public var `model`: String?
    public var `configured`: Bool
    public var `keySource`: ConfigResponseDeciderKeySource?
    public var `sharedKey`: Bool?
    public var `included`: Bool?
    public var `enabled`: Bool
    public var `jobs`: ConfigResponseDeciderJobs
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `provider`: ConfigResponseDeciderProvider,
        `configured`: Bool,
        `enabled`: Bool,
        `jobs`: ConfigResponseDeciderJobs,
        `model`: String? = nil,
        `keySource`: ConfigResponseDeciderKeySource? = nil,
        `sharedKey`: Bool? = nil,
        `included`: Bool? = nil
    ) {
        self.`provider` = `provider`
        self.`model` = `model`
        self.`configured` = `configured`
        self.`keySource` = `keySource`
        self.`sharedKey` = `sharedKey`
        self.`included` = `included`
        self.`enabled` = `enabled`
        self.`jobs` = `jobs`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `provider` = try object.required("provider")
        `model` = try object.optional("model")
        `configured` = try object.required("configured")
        `keySource` = try object.optional("keySource")
        `sharedKey` = try object.optional("sharedKey")
        `included` = try object.optional("included")
        `enabled` = try object.required("enabled")
        `jobs` = try object.required("jobs")
        additionalFields = object.remainder(excluding: ["provider", "model", "configured", "keySource", "sharedKey", "included", "enabled", "jobs"])
        explicitNulls = object.nullKeys.intersection(["provider", "model", "configured", "keySource", "sharedKey", "included", "enabled", "jobs"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("provider", `provider`)
        try object.putOptional("model", `model`, nulls: explicitNulls)
        try object.put("configured", `configured`)
        try object.putOptional("keySource", `keySource`, nulls: explicitNulls)
        try object.putOptional("sharedKey", `sharedKey`, nulls: explicitNulls)
        try object.putOptional("included", `included`, nulls: explicitNulls)
        try object.put("enabled", `enabled`)
        try object.put("jobs", `jobs`)
        try object.encode(to: encoder)
    }
}

public enum ConfigResponseDeciderProvider: WireModel, Hashable, Sendable {
    case `jev`
    case `workersai`
    case `openrouter`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "jev": self = .`jev`
        case "workersai": self = .`workersai`
        case "openrouter": self = .`openrouter`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`jev`: return "jev"
        case .`workersai`: return "workersai"
        case .`openrouter`: return "openrouter"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum ConfigResponseDeciderKeySource: WireModel, Hashable, Sendable {
    case `own`
    case `shared`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "own": self = .`own`
        case "shared": self = .`shared`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`own`: return "own"
        case .`shared`: return "shared"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ConfigResponseDeciderJobs: WireModel {
    public var `roomRouting`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`roomRouting`: Bool) {
        self.`roomRouting` = `roomRouting`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `roomRouting` = try object.required("roomRouting")
        additionalFields = object.remainder(excluding: ["roomRouting"])
        explicitNulls = object.nullKeys.intersection(["roomRouting"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("roomRouting", `roomRouting`)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseHelpers: WireModel {
    public var `own`: ConfigResponseHelpersOwn
    public var `sharedKey`: Bool?
    public var `workersAiAccountId`: String?
    public var `extraction`: ConfigResponseHelpersExtraction
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`own`: ConfigResponseHelpersOwn, `extraction`: ConfigResponseHelpersExtraction, `sharedKey`: Bool? = nil, `workersAiAccountId`: String? = nil) {
        self.`own` = `own`
        self.`sharedKey` = `sharedKey`
        self.`workersAiAccountId` = `workersAiAccountId`
        self.`extraction` = `extraction`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `own` = try object.required("own")
        `sharedKey` = try object.optional("sharedKey")
        `workersAiAccountId` = try object.optional("workersAiAccountId")
        `extraction` = try object.required("extraction")
        additionalFields = object.remainder(excluding: ["own", "sharedKey", "workersAiAccountId", "extraction"])
        explicitNulls = object.nullKeys.intersection(["own", "sharedKey", "workersAiAccountId", "extraction"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("own", `own`)
        try object.putOptional("sharedKey", `sharedKey`, nulls: explicitNulls)
        try object.putOptional("workersAiAccountId", `workersAiAccountId`, nulls: explicitNulls)
        try object.put("extraction", `extraction`)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseHelpersOwn: WireModel {
    public var `jev`: Bool
    public var `workersAi`: Bool
    public var `openrouter`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`jev`: Bool, `workersAi`: Bool, `openrouter`: Bool) {
        self.`jev` = `jev`
        self.`workersAi` = `workersAi`
        self.`openrouter` = `openrouter`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `jev` = try object.required("jev")
        `workersAi` = try object.required("workersAi")
        `openrouter` = try object.required("openrouter")
        additionalFields = object.remainder(excluding: ["jev", "workersAi", "openrouter"])
        explicitNulls = object.nullKeys.intersection(["jev", "workersAi", "openrouter"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("jev", `jev`)
        try object.put("workersAi", `workersAi`)
        try object.put("openrouter", `openrouter`)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseHelpersExtraction: WireModel {
    public var `provider`: ConfigResponseHelpersExtractionProvider?
    public var `included`: Bool?
    public var `ready`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`ready`: Bool, `provider`: ConfigResponseHelpersExtractionProvider? = nil, `included`: Bool? = nil) {
        self.`provider` = `provider`
        self.`included` = `included`
        self.`ready` = `ready`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `provider` = try object.optional("provider")
        `included` = try object.optional("included")
        `ready` = try object.required("ready")
        additionalFields = object.remainder(excluding: ["provider", "included", "ready"])
        explicitNulls = object.nullKeys.intersection(["provider", "included", "ready"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("provider", `provider`, nulls: explicitNulls)
        try object.putOptional("included", `included`, nulls: explicitNulls)
        try object.put("ready", `ready`)
        try object.encode(to: encoder)
    }
}

public enum ConfigResponseHelpersExtractionProvider: WireModel, Hashable, Sendable {
    case `jev`
    case `workersai`
    case `openrouter`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "jev": self = .`jev`
        case "workersai": self = .`workersai`
        case "openrouter": self = .`openrouter`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`jev`: return "jev"
        case .`workersai`: return "workersai"
        case .`openrouter`: return "openrouter"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ConfigResponseSavedKeys: WireModel {
    public var `ttsKey`: SavedKey?
    public var `fishAudioKey`: SavedKey?
    public var `geminiTtsKey`: SavedKey?
    public var `jevApiKey`: SavedKey?
    public var `openrouterDeciderKey`: SavedKey?
    public var `workersAiToken`: SavedKey?
    public var `openaiImageApiKey`: SavedKey?
    public var `customImageApiKey`: SavedKey?
    public var `openaiLiveKey`: SavedKey?
    public var `geminiImageApiKey`: SavedKey?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `ttsKey`: SavedKey? = nil,
        `fishAudioKey`: SavedKey? = nil,
        `geminiTtsKey`: SavedKey? = nil,
        `jevApiKey`: SavedKey? = nil,
        `openrouterDeciderKey`: SavedKey? = nil,
        `workersAiToken`: SavedKey? = nil,
        `openaiImageApiKey`: SavedKey? = nil,
        `customImageApiKey`: SavedKey? = nil,
        `openaiLiveKey`: SavedKey? = nil,
        `geminiImageApiKey`: SavedKey? = nil
    ) {
        self.`ttsKey` = `ttsKey`
        self.`fishAudioKey` = `fishAudioKey`
        self.`geminiTtsKey` = `geminiTtsKey`
        self.`jevApiKey` = `jevApiKey`
        self.`openrouterDeciderKey` = `openrouterDeciderKey`
        self.`workersAiToken` = `workersAiToken`
        self.`openaiImageApiKey` = `openaiImageApiKey`
        self.`customImageApiKey` = `customImageApiKey`
        self.`openaiLiveKey` = `openaiLiveKey`
        self.`geminiImageApiKey` = `geminiImageApiKey`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `ttsKey` = try object.optional("ttsKey")
        `fishAudioKey` = try object.optional("fishAudioKey")
        `geminiTtsKey` = try object.optional("geminiTtsKey")
        `jevApiKey` = try object.optional("jevApiKey")
        `openrouterDeciderKey` = try object.optional("openrouterDeciderKey")
        `workersAiToken` = try object.optional("workersAiToken")
        `openaiImageApiKey` = try object.optional("openaiImageApiKey")
        `customImageApiKey` = try object.optional("customImageApiKey")
        `openaiLiveKey` = try object.optional("openaiLiveKey")
        `geminiImageApiKey` = try object.optional("geminiImageApiKey")
        additionalFields = object.remainder(excluding: ["ttsKey", "fishAudioKey", "geminiTtsKey", "jevApiKey", "openrouterDeciderKey", "workersAiToken", "openaiImageApiKey", "customImageApiKey", "openaiLiveKey", "geminiImageApiKey"])
        explicitNulls = object.nullKeys.intersection(["ttsKey", "fishAudioKey", "geminiTtsKey", "jevApiKey", "openrouterDeciderKey", "workersAiToken", "openaiImageApiKey", "customImageApiKey", "openaiLiveKey", "geminiImageApiKey"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("ttsKey", `ttsKey`, nulls: explicitNulls)
        try object.putOptional("fishAudioKey", `fishAudioKey`, nulls: explicitNulls)
        try object.putOptional("geminiTtsKey", `geminiTtsKey`, nulls: explicitNulls)
        try object.putOptional("jevApiKey", `jevApiKey`, nulls: explicitNulls)
        try object.putOptional("openrouterDeciderKey", `openrouterDeciderKey`, nulls: explicitNulls)
        try object.putOptional("workersAiToken", `workersAiToken`, nulls: explicitNulls)
        try object.putOptional("openaiImageApiKey", `openaiImageApiKey`, nulls: explicitNulls)
        try object.putOptional("customImageApiKey", `customImageApiKey`, nulls: explicitNulls)
        try object.putOptional("openaiLiveKey", `openaiLiveKey`, nulls: explicitNulls)
        try object.putOptional("geminiImageApiKey", `geminiImageApiKey`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseImageGen: WireModel {
    public var `configured`: Bool
    public var `provider`: ImageProvider?
    public var `model`: String?
    public var `primary`: ImageSlotStatus?
    public var `fallback`: ImageSlotStatus?
    public var `ready`: Bool?
    public var `maxPerTurn`: Double?
    public var `customUrl`: String?
    public var `customModel`: String?
    public var `openaiConfigured`: Bool?
    public var `xaiConfigured`: Bool?
    public var `customKeyConfigured`: Bool?
    public var `geminiConfigured`: Bool?
    public var `openrouterConfigured`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `configured`: Bool,
        `provider`: ImageProvider? = nil,
        `model`: String? = nil,
        `primary`: ImageSlotStatus? = nil,
        `fallback`: ImageSlotStatus? = nil,
        `ready`: Bool? = nil,
        `maxPerTurn`: Double? = nil,
        `customUrl`: String? = nil,
        `customModel`: String? = nil,
        `openaiConfigured`: Bool? = nil,
        `xaiConfigured`: Bool? = nil,
        `customKeyConfigured`: Bool? = nil,
        `geminiConfigured`: Bool? = nil,
        `openrouterConfigured`: Bool? = nil
    ) {
        self.`configured` = `configured`
        self.`provider` = `provider`
        self.`model` = `model`
        self.`primary` = `primary`
        self.`fallback` = `fallback`
        self.`ready` = `ready`
        self.`maxPerTurn` = `maxPerTurn`
        self.`customUrl` = `customUrl`
        self.`customModel` = `customModel`
        self.`openaiConfigured` = `openaiConfigured`
        self.`xaiConfigured` = `xaiConfigured`
        self.`customKeyConfigured` = `customKeyConfigured`
        self.`geminiConfigured` = `geminiConfigured`
        self.`openrouterConfigured` = `openrouterConfigured`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `configured` = try object.required("configured")
        `provider` = try object.optional("provider")
        `model` = try object.optional("model")
        `primary` = try object.optional("primary")
        `fallback` = try object.optional("fallback")
        `ready` = try object.optional("ready")
        `maxPerTurn` = try object.optional("maxPerTurn")
        `customUrl` = try object.optional("customUrl")
        `customModel` = try object.optional("customModel")
        `openaiConfigured` = try object.optional("openaiConfigured")
        `xaiConfigured` = try object.optional("xaiConfigured")
        `customKeyConfigured` = try object.optional("customKeyConfigured")
        `geminiConfigured` = try object.optional("geminiConfigured")
        `openrouterConfigured` = try object.optional("openrouterConfigured")
        additionalFields = object.remainder(excluding: ["configured", "provider", "model", "primary", "fallback", "ready", "maxPerTurn", "customUrl", "customModel", "openaiConfigured", "xaiConfigured", "customKeyConfigured", "geminiConfigured", "openrouterConfigured"])
        explicitNulls = object.nullKeys.intersection(["configured", "provider", "model", "primary", "fallback", "ready", "maxPerTurn", "customUrl", "customModel", "openaiConfigured", "xaiConfigured", "customKeyConfigured", "geminiConfigured", "openrouterConfigured"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("configured", `configured`)
        try object.putOptional("provider", `provider`, nulls: explicitNulls)
        try object.putOptional("model", `model`, nulls: explicitNulls)
        try object.putOptional("primary", `primary`, nulls: explicitNulls)
        try object.putOptional("fallback", `fallback`, nulls: explicitNulls)
        try object.putOptional("ready", `ready`, nulls: explicitNulls)
        try object.putOptional("maxPerTurn", `maxPerTurn`, nulls: explicitNulls)
        try object.putOptional("customUrl", `customUrl`, nulls: explicitNulls)
        try object.putOptional("customModel", `customModel`, nulls: explicitNulls)
        try object.putOptional("openaiConfigured", `openaiConfigured`, nulls: explicitNulls)
        try object.putOptional("xaiConfigured", `xaiConfigured`, nulls: explicitNulls)
        try object.putOptional("customKeyConfigured", `customKeyConfigured`, nulls: explicitNulls)
        try object.putOptional("geminiConfigured", `geminiConfigured`, nulls: explicitNulls)
        try object.putOptional("openrouterConfigured", `openrouterConfigured`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseProfile: WireModel {
    public var `name`: String
    public var `email`: String
    public var `aboutMe`: String?
    public var `avatarUrl`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `email`: String, `aboutMe`: String? = nil, `avatarUrl`: String? = nil) {
        self.`name` = `name`
        self.`email` = `email`
        self.`aboutMe` = `aboutMe`
        self.`avatarUrl` = `avatarUrl`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `email` = try object.required("email")
        `aboutMe` = try object.optional("aboutMe")
        `avatarUrl` = try object.optional("avatarUrl")
        additionalFields = object.remainder(excluding: ["name", "email", "aboutMe", "avatarUrl"])
        explicitNulls = object.nullKeys.intersection(["name", "email", "aboutMe", "avatarUrl"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.put("email", `email`)
        try object.putOptional("aboutMe", `aboutMe`, nulls: explicitNulls)
        try object.putOptional("avatarUrl", `avatarUrl`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ConfigResponseFeatures: WireModel {
    public var `skillAuthoring`: Bool
    public var `skillReview`: Bool?
    public var `skillReviewSteps`: Double?
    public var `showToolCalls`: Bool?
    public var `browser`: Bool?
    public var `sharedComputers`: Bool?
    public var `claudeUserMcp`: Bool?
    public var `llmThreadTitles`: Bool?
    public var `skillsLibrary`: Bool?
    public var `shareLearnedSkills`: ConfigResponseFeaturesShareLearnedSkills?
    public var `roomMemoryCapture`: Bool?
    public var `savedSteps`: Bool?
    public var `savedStepsHere`: Bool?
    public var `usbPhoneTakeover`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `skillAuthoring`: Bool,
        `skillReview`: Bool? = nil,
        `skillReviewSteps`: Double? = nil,
        `showToolCalls`: Bool? = nil,
        `browser`: Bool? = nil,
        `sharedComputers`: Bool? = nil,
        `claudeUserMcp`: Bool? = nil,
        `llmThreadTitles`: Bool? = nil,
        `skillsLibrary`: Bool? = nil,
        `shareLearnedSkills`: ConfigResponseFeaturesShareLearnedSkills? = nil,
        `roomMemoryCapture`: Bool? = nil,
        `savedSteps`: Bool? = nil,
        `savedStepsHere`: Bool? = nil,
        `usbPhoneTakeover`: Bool? = nil
    ) {
        self.`skillAuthoring` = `skillAuthoring`
        self.`skillReview` = `skillReview`
        self.`skillReviewSteps` = `skillReviewSteps`
        self.`showToolCalls` = `showToolCalls`
        self.`browser` = `browser`
        self.`sharedComputers` = `sharedComputers`
        self.`claudeUserMcp` = `claudeUserMcp`
        self.`llmThreadTitles` = `llmThreadTitles`
        self.`skillsLibrary` = `skillsLibrary`
        self.`shareLearnedSkills` = `shareLearnedSkills`
        self.`roomMemoryCapture` = `roomMemoryCapture`
        self.`savedSteps` = `savedSteps`
        self.`savedStepsHere` = `savedStepsHere`
        self.`usbPhoneTakeover` = `usbPhoneTakeover`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `skillAuthoring` = try object.required("skillAuthoring")
        `skillReview` = try object.optional("skillReview")
        `skillReviewSteps` = try object.optional("skillReviewSteps")
        `showToolCalls` = try object.optional("showToolCalls")
        `browser` = try object.optional("browser")
        `sharedComputers` = try object.optional("sharedComputers")
        `claudeUserMcp` = try object.optional("claudeUserMcp")
        `llmThreadTitles` = try object.optional("llmThreadTitles")
        `skillsLibrary` = try object.optional("skillsLibrary")
        `shareLearnedSkills` = try object.optional("shareLearnedSkills")
        `roomMemoryCapture` = try object.optional("roomMemoryCapture")
        `savedSteps` = try object.optional("savedSteps")
        `savedStepsHere` = try object.optional("savedStepsHere")
        `usbPhoneTakeover` = try object.optional("usbPhoneTakeover")
        additionalFields = object.remainder(excluding: ["skillAuthoring", "skillReview", "skillReviewSteps", "showToolCalls", "browser", "sharedComputers", "claudeUserMcp", "llmThreadTitles", "skillsLibrary", "shareLearnedSkills", "roomMemoryCapture", "savedSteps", "savedStepsHere", "usbPhoneTakeover"])
        explicitNulls = object.nullKeys.intersection(["skillAuthoring", "skillReview", "skillReviewSteps", "showToolCalls", "browser", "sharedComputers", "claudeUserMcp", "llmThreadTitles", "skillsLibrary", "shareLearnedSkills", "roomMemoryCapture", "savedSteps", "savedStepsHere", "usbPhoneTakeover"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("skillAuthoring", `skillAuthoring`)
        try object.putOptional("skillReview", `skillReview`, nulls: explicitNulls)
        try object.putOptional("skillReviewSteps", `skillReviewSteps`, nulls: explicitNulls)
        try object.putOptional("showToolCalls", `showToolCalls`, nulls: explicitNulls)
        try object.putOptional("browser", `browser`, nulls: explicitNulls)
        try object.putOptional("sharedComputers", `sharedComputers`, nulls: explicitNulls)
        try object.putOptional("claudeUserMcp", `claudeUserMcp`, nulls: explicitNulls)
        try object.putOptional("llmThreadTitles", `llmThreadTitles`, nulls: explicitNulls)
        try object.putOptional("skillsLibrary", `skillsLibrary`, nulls: explicitNulls)
        try object.putOptional("shareLearnedSkills", `shareLearnedSkills`, nulls: explicitNulls)
        try object.putOptional("roomMemoryCapture", `roomMemoryCapture`, nulls: explicitNulls)
        try object.putOptional("savedSteps", `savedSteps`, nulls: explicitNulls)
        try object.putOptional("savedStepsHere", `savedStepsHere`, nulls: explicitNulls)
        try object.putOptional("usbPhoneTakeover", `usbPhoneTakeover`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum ConfigResponseFeaturesShareLearnedSkills: WireModel, Hashable, Sendable {
    case `off`
    case `ask`
    case `auto`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "off": self = .`off`
        case "ask": self = .`ask`
        case "auto": self = .`auto`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`off`: return "off"
        case .`ask`: return "ask"
        case .`auto`: return "auto"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ConfigResponseTeam: WireModel {
    public var `id`: String
    public var `name`: String
    public var `cloudPage`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`id`: String, `name`: String, `cloudPage`: String? = nil) {
        self.`id` = `id`
        self.`name` = `name`
        self.`cloudPage` = `cloudPage`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `name` = try object.required("name")
        `cloudPage` = try object.optional("cloudPage")
        additionalFields = object.remainder(excluding: ["id", "name", "cloudPage"])
        explicitNulls = object.nullKeys.intersection(["id", "name", "cloudPage"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("name", `name`)
        try object.putOptional("cloudPage", `cloudPage`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct EnvironmentInfo: WireModel {
    public var `environmentId`: String
    public var `label`: String
    public var `platform`: String
    public var `version`: String
    public var `capabilities`: EnvironmentInfoCapabilities
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `environmentId`: String,
        `label`: String,
        `platform`: String,
        `version`: String,
        `capabilities`: EnvironmentInfoCapabilities
    ) {
        self.`environmentId` = `environmentId`
        self.`label` = `label`
        self.`platform` = `platform`
        self.`version` = `version`
        self.`capabilities` = `capabilities`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `environmentId` = try object.required("environmentId")
        `label` = try object.required("label")
        `platform` = try object.required("platform")
        `version` = try object.required("version")
        `capabilities` = try object.required("capabilities")
        additionalFields = object.remainder(excluding: ["environmentId", "label", "platform", "version", "capabilities"])
        explicitNulls = object.nullKeys.intersection(["environmentId", "label", "platform", "version", "capabilities"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("environmentId", `environmentId`)
        try object.put("label", `label`)
        try object.put("platform", `platform`)
        try object.put("version", `version`)
        try object.put("capabilities", `capabilities`)
        try object.encode(to: encoder)
    }
}

public struct EnvironmentInfoCapabilities: WireModel {
    public var `remoteSessions`: Bool
    public var `sharedComputers`: Bool?
    public var `lendingDetails`: Bool?
    public var `deviceLink`: Bool?
    public var `myChromeLink`: Bool?
    public var `computerAsks`: Bool?
    public var `commandTimeouts`: Bool?
    public var `longCommands`: Bool?
    public var `fileEdits`: Bool?
    public var `lentMcp`: Bool?
    public var `cloudHome`: Bool?
    public var `cloudTeam`: Bool?
    public var `move`: Double?
    public var `selfUpdate`: EnvironmentInfoCapabilitiesSelfUpdate
    public var `install`: ServerInstall?
    public var `emailSignIn`: Bool?
    public var `jobs`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `remoteSessions`: Bool,
        `selfUpdate`: EnvironmentInfoCapabilitiesSelfUpdate,
        `jobs`: Bool,
        `sharedComputers`: Bool? = nil,
        `lendingDetails`: Bool? = nil,
        `deviceLink`: Bool? = nil,
        `myChromeLink`: Bool? = nil,
        `computerAsks`: Bool? = nil,
        `commandTimeouts`: Bool? = nil,
        `longCommands`: Bool? = nil,
        `fileEdits`: Bool? = nil,
        `lentMcp`: Bool? = nil,
        `cloudHome`: Bool? = nil,
        `cloudTeam`: Bool? = nil,
        `move`: Double? = nil,
        `install`: ServerInstall? = nil,
        `emailSignIn`: Bool? = nil
    ) {
        self.`remoteSessions` = `remoteSessions`
        self.`sharedComputers` = `sharedComputers`
        self.`lendingDetails` = `lendingDetails`
        self.`deviceLink` = `deviceLink`
        self.`myChromeLink` = `myChromeLink`
        self.`computerAsks` = `computerAsks`
        self.`commandTimeouts` = `commandTimeouts`
        self.`longCommands` = `longCommands`
        self.`fileEdits` = `fileEdits`
        self.`lentMcp` = `lentMcp`
        self.`cloudHome` = `cloudHome`
        self.`cloudTeam` = `cloudTeam`
        self.`move` = `move`
        self.`selfUpdate` = `selfUpdate`
        self.`install` = `install`
        self.`emailSignIn` = `emailSignIn`
        self.`jobs` = `jobs`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `remoteSessions` = try object.required("remoteSessions")
        `sharedComputers` = try object.optional("sharedComputers")
        `lendingDetails` = try object.optional("lendingDetails")
        `deviceLink` = try object.optional("deviceLink")
        `myChromeLink` = try object.optional("myChromeLink")
        `computerAsks` = try object.optional("computerAsks")
        `commandTimeouts` = try object.optional("commandTimeouts")
        `longCommands` = try object.optional("longCommands")
        `fileEdits` = try object.optional("fileEdits")
        `lentMcp` = try object.optional("lentMcp")
        `cloudHome` = try object.optional("cloudHome")
        `cloudTeam` = try object.optional("cloudTeam")
        `move` = try object.optional("move")
        `selfUpdate` = try object.required("selfUpdate")
        `install` = try object.optional("install")
        `emailSignIn` = try object.optional("emailSignIn")
        `jobs` = try object.required("jobs")
        additionalFields = object.remainder(excluding: ["remoteSessions", "sharedComputers", "lendingDetails", "deviceLink", "myChromeLink", "computerAsks", "commandTimeouts", "longCommands", "fileEdits", "lentMcp", "cloudHome", "cloudTeam", "move", "selfUpdate", "install", "emailSignIn", "jobs"])
        explicitNulls = object.nullKeys.intersection(["remoteSessions", "sharedComputers", "lendingDetails", "deviceLink", "myChromeLink", "computerAsks", "commandTimeouts", "longCommands", "fileEdits", "lentMcp", "cloudHome", "cloudTeam", "move", "selfUpdate", "install", "emailSignIn", "jobs"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("remoteSessions", `remoteSessions`)
        try object.putOptional("sharedComputers", `sharedComputers`, nulls: explicitNulls)
        try object.putOptional("lendingDetails", `lendingDetails`, nulls: explicitNulls)
        try object.putOptional("deviceLink", `deviceLink`, nulls: explicitNulls)
        try object.putOptional("myChromeLink", `myChromeLink`, nulls: explicitNulls)
        try object.putOptional("computerAsks", `computerAsks`, nulls: explicitNulls)
        try object.putOptional("commandTimeouts", `commandTimeouts`, nulls: explicitNulls)
        try object.putOptional("longCommands", `longCommands`, nulls: explicitNulls)
        try object.putOptional("fileEdits", `fileEdits`, nulls: explicitNulls)
        try object.putOptional("lentMcp", `lentMcp`, nulls: explicitNulls)
        try object.putOptional("cloudHome", `cloudHome`, nulls: explicitNulls)
        try object.putOptional("cloudTeam", `cloudTeam`, nulls: explicitNulls)
        try object.putOptional("move", `move`, nulls: explicitNulls)
        try object.put("selfUpdate", `selfUpdate`)
        try object.putOptional("install", `install`, nulls: explicitNulls)
        try object.putOptional("emailSignIn", `emailSignIn`, nulls: explicitNulls)
        try object.put("jobs", `jobs`)
        try object.encode(to: encoder)
    }
}

public enum EnvironmentInfoCapabilitiesSelfUpdate: WireModel, Hashable, Sendable {
    case `desktopManaged`
    case `operator`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "desktop-managed": self = .`desktopManaged`
        case "operator": self = .`operator`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`desktopManaged`: return "desktop-managed"
        case .`operator`: return "operator"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct AuthSession: WireModel {
    public var `kind`: AuthSessionKind
    public var `scopes`: [String]
    public var `environmentId`: String
    public var `id`: String?
    public var `label`: String?
    public var `expiresAt`: Double?
    public var `via`: String?
    public var `email`: String?
    public var `displayName`: String?
    public var `owner`: String?
    public var `hosted`: Bool?
    public var `cloudHome`: Bool?
    public var `own`: Bool?
    public var `lending`: [String: Bool]?
    public var `team`: [String: JSONValue]?
    public var `teamSignIn`: String?
    public var `openedThreads`: [String]?
    public var `cloudGuest`: Bool?
    public var `reactor`: String?
    public var `trust`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `kind`: AuthSessionKind,
        `scopes`: [String],
        `environmentId`: String,
        `id`: String? = nil,
        `label`: String? = nil,
        `expiresAt`: Double? = nil,
        `via`: String? = nil,
        `email`: String? = nil,
        `displayName`: String? = nil,
        `owner`: String? = nil,
        `hosted`: Bool? = nil,
        `cloudHome`: Bool? = nil,
        `own`: Bool? = nil,
        `lending`: [String: Bool]? = nil,
        `team`: [String: JSONValue]? = nil,
        `teamSignIn`: String? = nil,
        `openedThreads`: [String]? = nil,
        `cloudGuest`: Bool? = nil,
        `reactor`: String? = nil,
        `trust`: String? = nil
    ) {
        self.`kind` = `kind`
        self.`scopes` = `scopes`
        self.`environmentId` = `environmentId`
        self.`id` = `id`
        self.`label` = `label`
        self.`expiresAt` = `expiresAt`
        self.`via` = `via`
        self.`email` = `email`
        self.`displayName` = `displayName`
        self.`owner` = `owner`
        self.`hosted` = `hosted`
        self.`cloudHome` = `cloudHome`
        self.`own` = `own`
        self.`lending` = `lending`
        self.`team` = `team`
        self.`teamSignIn` = `teamSignIn`
        self.`openedThreads` = `openedThreads`
        self.`cloudGuest` = `cloudGuest`
        self.`reactor` = `reactor`
        self.`trust` = `trust`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `kind` = try object.required("kind")
        `scopes` = try object.required("scopes")
        `environmentId` = try object.required("environmentId")
        `id` = try object.optional("id")
        `label` = try object.optional("label")
        `expiresAt` = try object.optional("expiresAt")
        `via` = try object.optional("via")
        `email` = try object.optional("email")
        `displayName` = try object.optional("displayName")
        `owner` = try object.optional("owner")
        `hosted` = try object.optional("hosted")
        `cloudHome` = try object.optional("cloudHome")
        `own` = try object.optional("own")
        `lending` = try object.optional("lending")
        `team` = try object.optional("team")
        `teamSignIn` = try object.optional("teamSignIn")
        `openedThreads` = try object.optional("openedThreads")
        `cloudGuest` = try object.optional("cloudGuest")
        `reactor` = try object.optional("reactor")
        `trust` = try object.optional("trust")
        additionalFields = object.remainder(excluding: ["kind", "scopes", "environmentId", "id", "label", "expiresAt", "via", "email", "displayName", "owner", "hosted", "cloudHome", "own", "lending", "team", "teamSignIn", "openedThreads", "cloudGuest", "reactor", "trust"])
        explicitNulls = object.nullKeys.intersection(["kind", "scopes", "environmentId", "id", "label", "expiresAt", "via", "email", "displayName", "owner", "hosted", "cloudHome", "own", "lending", "team", "teamSignIn", "openedThreads", "cloudGuest", "reactor", "trust"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("kind", `kind`)
        try object.put("scopes", `scopes`)
        try object.put("environmentId", `environmentId`)
        try object.putOptional("id", `id`, nulls: explicitNulls)
        try object.putOptional("label", `label`, nulls: explicitNulls)
        try object.putOptional("expiresAt", `expiresAt`, nulls: explicitNulls)
        try object.putOptional("via", `via`, nulls: explicitNulls)
        try object.putOptional("email", `email`, nulls: explicitNulls)
        try object.putOptional("displayName", `displayName`, nulls: explicitNulls)
        try object.putOptional("owner", `owner`, nulls: explicitNulls)
        try object.putOptional("hosted", `hosted`, nulls: explicitNulls)
        try object.putOptional("cloudHome", `cloudHome`, nulls: explicitNulls)
        try object.putOptional("own", `own`, nulls: explicitNulls)
        try object.putOptional("lending", `lending`, nulls: explicitNulls)
        try object.putOptional("team", `team`, nulls: explicitNulls)
        try object.putOptional("teamSignIn", `teamSignIn`, nulls: explicitNulls)
        try object.putOptional("openedThreads", `openedThreads`, nulls: explicitNulls)
        try object.putOptional("cloudGuest", `cloudGuest`, nulls: explicitNulls)
        try object.putOptional("reactor", `reactor`, nulls: explicitNulls)
        try object.putOptional("trust", `trust`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum AuthSessionKind: WireModel, Hashable, Sendable {
    case `loopback`
    case `session`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "loopback": self = .`loopback`
        case "session": self = .`session`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`loopback`: return "loopback"
        case .`session`: return "session"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct APIError: WireModel {
    public var `error`: String
    public var `code`: String?
    public var `errorKey`: String?
    public var `errorParams`: ServerTextParams?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`error`: String, `code`: String? = nil, `errorKey`: String? = nil, `errorParams`: ServerTextParams? = nil) {
        self.`error` = `error`
        self.`code` = `code`
        self.`errorKey` = `errorKey`
        self.`errorParams` = `errorParams`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `error` = try object.required("error")
        `code` = try object.optional("code")
        `errorKey` = try object.optional("errorKey")
        `errorParams` = try object.optional("errorParams")
        additionalFields = object.remainder(excluding: ["error", "code", "errorKey", "errorParams"])
        explicitNulls = object.nullKeys.intersection(["error", "code", "errorKey", "errorParams"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("error", `error`)
        try object.putOptional("code", `code`, nulls: explicitNulls)
        try object.putOptional("errorKey", `errorKey`, nulls: explicitNulls)
        try object.putOptional("errorParams", `errorParams`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct PairResponse: WireModel {
    public var `token`: String
    public var `session`: PublicSession?
    public var `environment`: EnvironmentInfo?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`token`: String, `session`: PublicSession? = nil, `environment`: EnvironmentInfo? = nil) {
        self.`token` = `token`
        self.`session` = `session`
        self.`environment` = `environment`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `token` = try object.required("token")
        `session` = try object.optional("session")
        `environment` = try object.optional("environment")
        additionalFields = object.remainder(excluding: ["token", "session", "environment"])
        explicitNulls = object.nullKeys.intersection(["token", "session", "environment"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("token", `token`)
        try object.putOptional("session", `session`, nulls: explicitNulls)
        try object.putOptional("environment", `environment`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct EmailVerifyResponse: WireModel {
    public var `session`: PublicSession
    public var `environment`: EnvironmentInfo
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`session`: PublicSession, `environment`: EnvironmentInfo) {
        self.`session` = `session`
        self.`environment` = `environment`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `session` = try object.required("session")
        `environment` = try object.required("environment")
        additionalFields = object.remainder(excluding: ["session", "environment"])
        explicitNulls = object.nullKeys.intersection(["session", "environment"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("session", `session`)
        try object.put("environment", `environment`)
        try object.encode(to: encoder)
    }
}

public struct UploadResponse: WireModel {
    public var `path`: String
    public var `mime`: String
    public var `name`: String?
    public var `bytes`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`path`: String, `mime`: String, `name`: String? = nil, `bytes`: Double? = nil) {
        self.`path` = `path`
        self.`mime` = `mime`
        self.`name` = `name`
        self.`bytes` = `bytes`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `path` = try object.required("path")
        `mime` = try object.required("mime")
        `name` = try object.optional("name")
        `bytes` = try object.optional("bytes")
        additionalFields = object.remainder(excluding: ["path", "mime", "name", "bytes"])
        explicitNulls = object.nullKeys.intersection(["path", "mime", "name", "bytes"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("path", `path`)
        try object.put("mime", `mime`)
        try object.putOptional("name", `name`, nulls: explicitNulls)
        try object.putOptional("bytes", `bytes`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ActionResponse: WireModel {
    public var `ok`: Bool?
    public var `outcome`: String?
    public var `message`: ActionResponseMessage?
    public var `delivery`: String?
    public var `settlementPending`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `ok`: Bool? = nil,
        `outcome`: String? = nil,
        `message`: ActionResponseMessage? = nil,
        `delivery`: String? = nil,
        `settlementPending`: Bool? = nil
    ) {
        self.`ok` = `ok`
        self.`outcome` = `outcome`
        self.`message` = `message`
        self.`delivery` = `delivery`
        self.`settlementPending` = `settlementPending`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `ok` = try object.optional("ok")
        `outcome` = try object.optional("outcome")
        `message` = try object.optional("message")
        `delivery` = try object.optional("delivery")
        `settlementPending` = try object.optional("settlementPending")
        additionalFields = object.remainder(excluding: ["ok", "outcome", "message", "delivery", "settlementPending"])
        explicitNulls = object.nullKeys.intersection(["ok", "outcome", "message", "delivery", "settlementPending"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("ok", `ok`, nulls: explicitNulls)
        try object.putOptional("outcome", `outcome`, nulls: explicitNulls)
        try object.putOptional("message", `message`, nulls: explicitNulls)
        try object.putOptional("delivery", `delivery`, nulls: explicitNulls)
        try object.putOptional("settlementPending", `settlementPending`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public indirect enum ActionResponseMessage: WireModel {
    case object(WireMessage)
    case string(String)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(WireMessage.self) { self = .object(value); return }
        if let value = try? raw.decode(String.self) { self = .string(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .object(let value): try value.encode(to: encoder)
        case .string(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public struct ChatSendBody: WireModel {
    public var `text`: String
    public var `threadId`: String
    public var `sendId`: String
    public var `attachments`: [WireAttachment]?
    public var `replyToId`: String?
    public var `channelMode`: ChatSendBodyChannelMode?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `text`: String,
        `threadId`: String,
        `sendId`: String,
        `attachments`: [WireAttachment]? = nil,
        `replyToId`: String? = nil,
        `channelMode`: ChatSendBodyChannelMode? = nil
    ) {
        self.`text` = `text`
        self.`threadId` = `threadId`
        self.`sendId` = `sendId`
        self.`attachments` = `attachments`
        self.`replyToId` = `replyToId`
        self.`channelMode` = `channelMode`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `text` = try object.required("text")
        `threadId` = try object.required("threadId")
        `sendId` = try object.required("sendId")
        `attachments` = try object.optional("attachments")
        `replyToId` = try object.optional("replyToId")
        `channelMode` = try object.optional("channelMode")
        additionalFields = object.remainder(excluding: ["text", "threadId", "sendId", "attachments", "replyToId", "channelMode"])
        explicitNulls = object.nullKeys.intersection(["text", "threadId", "sendId", "attachments", "replyToId", "channelMode"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("text", `text`)
        try object.put("threadId", `threadId`)
        try object.put("sendId", `sendId`)
        try object.putOptional("attachments", `attachments`, nulls: explicitNulls)
        try object.putOptional("replyToId", `replyToId`, nulls: explicitNulls)
        try object.putOptional("channelMode", `channelMode`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum ChatSendBodyChannelMode: WireModel, Hashable, Sendable {
    case `chat`
    case `goal`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "chat": self = .`chat`
        case "goal": self = .`goal`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`chat`: return "chat"
        case .`goal`: return "goal"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct RespondBody: WireModel {
    public var `requestId`: String
    public var `behavior`: RespondBodyBehavior
    public var `message`: String?
    public var `answers`: [String: String]?
    public var `always`: Bool?
    public var `rememberCommand`: Bool?
    public var `allowSession`: Bool?
    public var `reviewedSha256`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `requestId`: String,
        `behavior`: RespondBodyBehavior,
        `message`: String? = nil,
        `answers`: [String: String]? = nil,
        `always`: Bool? = nil,
        `rememberCommand`: Bool? = nil,
        `allowSession`: Bool? = nil,
        `reviewedSha256`: String? = nil
    ) {
        self.`requestId` = `requestId`
        self.`behavior` = `behavior`
        self.`message` = `message`
        self.`answers` = `answers`
        self.`always` = `always`
        self.`rememberCommand` = `rememberCommand`
        self.`allowSession` = `allowSession`
        self.`reviewedSha256` = `reviewedSha256`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `requestId` = try object.required("requestId")
        `behavior` = try object.required("behavior")
        `message` = try object.optional("message")
        `answers` = try object.optional("answers")
        `always` = try object.optional("always")
        `rememberCommand` = try object.optional("rememberCommand")
        `allowSession` = try object.optional("allowSession")
        `reviewedSha256` = try object.optional("reviewedSha256")
        additionalFields = object.remainder(excluding: ["requestId", "behavior", "message", "answers", "always", "rememberCommand", "allowSession", "reviewedSha256"])
        explicitNulls = object.nullKeys.intersection(["requestId", "behavior", "message", "answers", "always", "rememberCommand", "allowSession", "reviewedSha256"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("requestId", `requestId`)
        try object.put("behavior", `behavior`)
        try object.putOptional("message", `message`, nulls: explicitNulls)
        try object.putOptional("answers", `answers`, nulls: explicitNulls)
        try object.putOptional("always", `always`, nulls: explicitNulls)
        try object.putOptional("rememberCommand", `rememberCommand`, nulls: explicitNulls)
        try object.putOptional("allowSession", `allowSession`, nulls: explicitNulls)
        try object.putOptional("reviewedSha256", `reviewedSha256`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum RespondBodyBehavior: WireModel, Hashable, Sendable {
    case `allow`
    case `deny`
    case `answer`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "allow": self = .`allow`
        case "deny": self = .`deny`
        case "answer": self = .`answer`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`allow`: return "allow"
        case .`deny`: return "deny"
        case .`answer`: return "answer"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct DataCardRef: WireModel {
    public var `botId`: String
    public var `cardId`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `cardId`: String) {
        self.`botId` = `botId`
        self.`cardId` = `cardId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `cardId` = try object.required("cardId")
        additionalFields = object.remainder(excluding: ["botId", "cardId"])
        explicitNulls = object.nullKeys.intersection(["botId", "cardId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("cardId", `cardId`)
        try object.encode(to: encoder)
    }
}

public struct PanelTarget: WireModel {
    public var `tab`: PanelTargetTab
    public var `page`: PanelPageID?
    public var `anchor`: String?
    public var `editInstructions`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`tab`: PanelTargetTab, `page`: PanelPageID? = nil, `anchor`: String? = nil, `editInstructions`: Bool? = nil) {
        self.`tab` = `tab`
        self.`page` = `page`
        self.`anchor` = `anchor`
        self.`editInstructions` = `editInstructions`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `tab` = try object.required("tab")
        `page` = try object.optional("page")
        `anchor` = try object.optional("anchor")
        `editInstructions` = try object.optional("editInstructions")
        additionalFields = object.remainder(excluding: ["tab", "page", "anchor", "editInstructions"])
        explicitNulls = object.nullKeys.intersection(["tab", "page", "anchor", "editInstructions"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("tab", `tab`)
        try object.putOptional("page", `page`, nulls: explicitNulls)
        try object.putOptional("anchor", `anchor`, nulls: explicitNulls)
        try object.putOptional("editInstructions", `editInstructions`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum PanelTargetTab: WireModel, Hashable, Sendable {
    case `details`
    case `library`
    case `computer`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "details": self = .`details`
        case "library": self = .`library`
        case "computer": self = .`computer`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`details`: return "details"
        case .`library`: return "library"
        case .`computer`: return "computer"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum PanelPageID: WireModel, Hashable, Sendable {
    case `settings`
    case `where`
    case `setup`
    case `model`
    case `instructions`
    case `approvals`
    case `always`
    case `routines`
    case `apps`
    case `memory`
    case `skills`
    case `browser`
    case `folder`
    case `android`
    case `voice`
    case `blurb`
    case `team`
    case `chiefteams`
    case `mcp`
    case `tools`
    case `webhooks`
    case `visibility`
    case `slack`
    case `overview`
    case `prompt`
    case `history`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "settings": self = .`settings`
        case "where": self = .`where`
        case "setup": self = .`setup`
        case "model": self = .`model`
        case "instructions": self = .`instructions`
        case "approvals": self = .`approvals`
        case "always": self = .`always`
        case "routines": self = .`routines`
        case "apps": self = .`apps`
        case "memory": self = .`memory`
        case "skills": self = .`skills`
        case "browser": self = .`browser`
        case "folder": self = .`folder`
        case "android": self = .`android`
        case "voice": self = .`voice`
        case "blurb": self = .`blurb`
        case "team": self = .`team`
        case "chiefteams": self = .`chiefteams`
        case "mcp": self = .`mcp`
        case "tools": self = .`tools`
        case "webhooks": self = .`webhooks`
        case "visibility": self = .`visibility`
        case "slack": self = .`slack`
        case "overview": self = .`overview`
        case "prompt": self = .`prompt`
        case "history": self = .`history`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`settings`: return "settings"
        case .`where`: return "where"
        case .`setup`: return "setup"
        case .`model`: return "model"
        case .`instructions`: return "instructions"
        case .`approvals`: return "approvals"
        case .`always`: return "always"
        case .`routines`: return "routines"
        case .`apps`: return "apps"
        case .`memory`: return "memory"
        case .`skills`: return "skills"
        case .`browser`: return "browser"
        case .`folder`: return "folder"
        case .`android`: return "android"
        case .`voice`: return "voice"
        case .`blurb`: return "blurb"
        case .`team`: return "team"
        case .`chiefteams`: return "chiefteams"
        case .`mcp`: return "mcp"
        case .`tools`: return "tools"
        case .`webhooks`: return "webhooks"
        case .`visibility`: return "visibility"
        case .`slack`: return "slack"
        case .`overview`: return "overview"
        case .`prompt`: return "prompt"
        case .`history`: return "history"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum SettingsPageID: WireModel, Hashable, Sendable {
    case `overview`
    case `phone`
    case `ai`
    case `bots`
    case `desktops`
    case `vault`
    case `usage`
    case `transfer`
    case `data`
    case `people`
    case `installations`
    case `account`
    case `plan`
    case `app`
    case `general`
    case `appearance`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "overview": self = .`overview`
        case "phone": self = .`phone`
        case "ai": self = .`ai`
        case "bots": self = .`bots`
        case "desktops": self = .`desktops`
        case "vault": self = .`vault`
        case "usage": self = .`usage`
        case "transfer": self = .`transfer`
        case "data": self = .`data`
        case "people": self = .`people`
        case "installations": self = .`installations`
        case "account": self = .`account`
        case "plan": self = .`plan`
        case "app": self = .`app`
        case "general": self = .`general`
        case "appearance": self = .`appearance`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`overview`: return "overview"
        case .`phone`: return "phone"
        case .`ai`: return "ai"
        case .`bots`: return "bots"
        case .`desktops`: return "desktops"
        case .`vault`: return "vault"
        case .`usage`: return "usage"
        case .`transfer`: return "transfer"
        case .`data`: return "data"
        case .`people`: return "people"
        case .`installations`: return "installations"
        case .`account`: return "account"
        case .`plan`: return "plan"
        case .`app`: return "app"
        case .`general`: return "general"
        case .`appearance`: return "appearance"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum BotSettingsSection: WireModel, Hashable, Sendable {
    case `overview`
    case `identity`
    case `slack`
    case `soul`
    case `skills`
    case `memory`
    case `library`
    case `routines`
    case `access`
    case `model`
    case `permissions`
    case `voice`
    case `visibility`
    case `history`
    case `usage`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "overview": self = .`overview`
        case "identity": self = .`identity`
        case "slack": self = .`slack`
        case "soul": self = .`soul`
        case "skills": self = .`skills`
        case "memory": self = .`memory`
        case "library": self = .`library`
        case "routines": self = .`routines`
        case "access": self = .`access`
        case "model": self = .`model`
        case "permissions": self = .`permissions`
        case "voice": self = .`voice`
        case "visibility": self = .`visibility`
        case "history": self = .`history`
        case "usage": self = .`usage`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`overview`: return "overview"
        case .`identity`: return "identity"
        case .`slack`: return "slack"
        case .`soul`: return "soul"
        case .`skills`: return "skills"
        case .`memory`: return "memory"
        case .`library`: return "library"
        case .`routines`: return "routines"
        case .`access`: return "access"
        case .`model`: return "model"
        case .`permissions`: return "permissions"
        case .`voice`: return "voice"
        case .`visibility`: return "visibility"
        case .`history`: return "history"
        case .`usage`: return "usage"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}
