import Foundation

public struct WireAttachmentImage: WireModel {
    public var `path`: String
    public var `mime`: String
    public var `name`: String?
    public var `source`: String?
    public var `fromTool`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `path`: String,
        `mime`: String,
        `name`: String? = nil,
        `source`: String? = nil,
        `fromTool`: Bool? = nil
    ) {
        self.`path` = `path`
        self.`mime` = `mime`
        self.`name` = `name`
        self.`source` = `source`
        self.`fromTool` = `fromTool`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `path` = try object.required("path")
        `mime` = try object.required("mime")
        `name` = try object.optional("name")
        `source` = try object.optional("source")
        `fromTool` = try object.optional("fromTool")
        additionalFields = object.remainder(excluding: ["path", "mime", "name", "source", "fromTool"])
        explicitNulls = object.nullKeys.intersection(["path", "mime", "name", "source", "fromTool"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("path", `path`)
        try object.put("mime", `mime`)
        try object.putOptional("name", `name`, nulls: explicitNulls)
        try object.putOptional("source", `source`, nulls: explicitNulls)
        try object.putOptional("fromTool", `fromTool`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WireAttachmentFile: WireModel {
    public var `path`: String
    public var `mime`: String
    public var `name`: String
    public var `source`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`path`: String, `mime`: String, `name`: String, `source`: String? = nil) {
        self.`path` = `path`
        self.`mime` = `mime`
        self.`name` = `name`
        self.`source` = `source`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `path` = try object.required("path")
        `mime` = try object.required("mime")
        `name` = try object.required("name")
        `source` = try object.optional("source")
        additionalFields = object.remainder(excluding: ["path", "mime", "name", "source"])
        explicitNulls = object.nullKeys.intersection(["path", "mime", "name", "source"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("path", `path`)
        try object.put("mime", `mime`)
        try object.put("name", `name`)
        try object.putOptional("source", `source`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WireAttachmentAudio: WireModel {
    public var `path`: String
    public var `mime`: String
    public var `durationMs`: Double?
    public var `text`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`path`: String, `mime`: String, `durationMs`: Double? = nil, `text`: String? = nil) {
        self.`path` = `path`
        self.`mime` = `mime`
        self.`durationMs` = `durationMs`
        self.`text` = `text`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `path` = try object.required("path")
        `mime` = try object.required("mime")
        `durationMs` = try object.optional("durationMs")
        `text` = try object.optional("text")
        additionalFields = object.remainder(excluding: ["path", "mime", "durationMs", "text"])
        explicitNulls = object.nullKeys.intersection(["path", "mime", "durationMs", "text"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("path", `path`)
        try object.put("mime", `mime`)
        try object.putOptional("durationMs", `durationMs`, nulls: explicitNulls)
        try object.putOptional("text", `text`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public indirect enum WireAttachment: WireModel {
    case `image`(WireAttachmentImage)
    case `file`(WireAttachmentFile)
    case `audio`(WireAttachmentAudio)
    case unknown(kind: String, raw: JSONValue)

    public var kind: String {
        switch self {
        case .`image`: return "image"
        case .`file`: return "file"
        case .`audio`: return "audio"
        case .unknown(let kind, _): return kind
        }
    }
    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        guard let kind = raw["kind"]?.stringValue else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Missing kind"))
        }
        var payload = raw
        payload["kind"] = nil
        switch kind {
        case "image": self = .`image`(try payload.decode(WireAttachmentImage.self))
        case "file": self = .`file`(try payload.decode(WireAttachmentFile.self))
        case "audio": self = .`audio`(try payload.decode(WireAttachmentAudio.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .`image`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`file`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`audio`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .unknown(_, let value): try value.encode(to: encoder)
        }
    }
}

public struct WireMessageFields: WireModel {
    private final class Storage: @unchecked Sendable {
        var `textCode`: String? = nil
        var `textParams`: ServerTextParams? = nil
        var `helperFollowup`: HelperFollowupFacts? = nil
        var `helperIntro`: Bool? = nil
        var `setupOffer`: Bool? = nil
        var `setupChoices`: [String]? = nil
        var `setupChoicesPending`: Bool? = nil
        var `setupChoicesUpdating`: Double? = nil
        var `wait`: WaitLine? = nil
        var `bugReport`: BugReportStatus? = nil
        var `roomRequest`: WireMessageFieldsRoomRequest? = nil
        var `id`: String
        var `role`: WireMessageFieldsRole
        var `text`: String? = nil
        var `digest`: TurnDigest? = nil
        var `engineCompaction`: Bool? = nil
        var `compaction`: WireMessageFieldsCompaction? = nil
        var `attachments`: [WireAttachment]? = nil
        var `card`: OptionCardData? = nil
        var `widget`: WidgetPayload? = nil
        var `serverCard`: Bool? = nil
        var `setupSuggestion`: WireMessageFieldsSetupSuggestion? = nil
        var `setupRequest`: Bool? = nil
        var `app`: AppPayload? = nil
        var `fromApp`: AppFromRef? = nil
        var `pointed`: [AppPointedRef]? = nil
        var `connector`: ConnectorCardData? = nil
        var `secret`: SecretRequestCardData? = nil
        var `signIn`: SignInRequestCardData? = nil
        var `routineRun`: RoutineRunCardData? = nil
        var `burst`: BurstCardData? = nil
        var `automation`: AutomationLine? = nil
        var `goalRun`: GroupGoalRunCardData? = nil
        var `call`: LiveCallRecord? = nil
        var `tool`: WireMessageFieldsTool? = nil
        var `webhookPost`: Bool? = nil
        var `steered`: Bool? = nil
        var `aside`: Bool? = nil
        var `via`: WireMessageFieldsVia? = nil
        var `callId`: String? = nil
        var `relayed`: Bool? = nil
        var `sender`: ResolvedSender? = nil
        var `turnId`: String? = nil
        var `stoppedBy`: ResolvedSender? = nil
        var `itemId`: String? = nil
        var `requestMessageId`: String? = nil
        var `turnSucceeded`: Bool? = nil
        var `requestCancelled`: Bool? = nil
        var `requestPending`: Bool? = nil
        var `turnTerminal`: Bool? = nil
        var `turnCompletedAt`: Double? = nil
        var `savedSteps`: SavedStepsMark? = nil
        var `png`: String? = nil
        var `mime`: String? = nil
        var `at`: Double
        var `parentId`: String? = nil
        var `replyToId`: String? = nil
        var `sendId`: String? = nil
        var `channelMode`: WireMessageFieldsChannelMode? = nil
        var `from`: WireMessageFieldsFrom? = nil
        var `threadPost`: WireMessageFieldsThreadPost? = nil
        var `peerPost`: WireMessageFieldsPeerPost? = nil
        var `routedBy`: WireMessageFieldsRoutedBy? = nil
        var `quickModel`: String? = nil
        var `doneWhen`: String? = nil
        var `peerAsk`: WireMessageFieldsPeerAsk? = nil
        var `reactions`: [WireMessageFieldsReactionsElement]? = nil
        var `reaction`: String? = nil
        var `comm`: WireMessageFieldsComm? = nil
        var `relay`: WireMessageFieldsRelay? = nil
        var `inbox`: InboxItem? = nil
        var `threadRef`: WireMessageFieldsThreadRef? = nil
        var `sentDirectly`: WireMessageFieldsSentDirectly? = nil
        var `publishedPage`: PublishedPageCard? = nil
        var `dataResult`: WireMessageFieldsDataResult? = nil
        var `dataContext`: WireMessageFieldsDataContext? = nil
        var `queued`: Bool? = nil
        var `queueId`: String? = nil
        var additionalFields: [String: JSONValue] = [:]
        var explicitNulls: Set<String> = []

        init(id: String, role: WireMessageFieldsRole, at: Double) {
            self.id = id
            self.role = role
            self.at = at
        }
    }

    private var storage: Storage

    private mutating func ensureUniqueStorage() {
        if !isKnownUniquelyReferenced(&storage) {
            let copy = Storage(id: storage.id, role: storage.role, at: storage.at)
            copy.textCode = storage.textCode
            copy.textParams = storage.textParams
            copy.helperFollowup = storage.helperFollowup
            copy.helperIntro = storage.helperIntro
            copy.setupOffer = storage.setupOffer
            copy.setupChoices = storage.setupChoices
            copy.setupChoicesPending = storage.setupChoicesPending
            copy.setupChoicesUpdating = storage.setupChoicesUpdating
            copy.wait = storage.wait
            copy.bugReport = storage.bugReport
            copy.roomRequest = storage.roomRequest
            copy.text = storage.text
            copy.digest = storage.digest
            copy.engineCompaction = storage.engineCompaction
            copy.compaction = storage.compaction
            copy.attachments = storage.attachments
            copy.card = storage.card
            copy.widget = storage.widget
            copy.serverCard = storage.serverCard
            copy.setupSuggestion = storage.setupSuggestion
            copy.setupRequest = storage.setupRequest
            copy.app = storage.app
            copy.fromApp = storage.fromApp
            copy.pointed = storage.pointed
            copy.connector = storage.connector
            copy.secret = storage.secret
            copy.signIn = storage.signIn
            copy.routineRun = storage.routineRun
            copy.burst = storage.burst
            copy.automation = storage.automation
            copy.goalRun = storage.goalRun
            copy.call = storage.call
            copy.tool = storage.tool
            copy.webhookPost = storage.webhookPost
            copy.steered = storage.steered
            copy.aside = storage.aside
            copy.via = storage.via
            copy.callId = storage.callId
            copy.relayed = storage.relayed
            copy.sender = storage.sender
            copy.turnId = storage.turnId
            copy.stoppedBy = storage.stoppedBy
            copy.itemId = storage.itemId
            copy.requestMessageId = storage.requestMessageId
            copy.turnSucceeded = storage.turnSucceeded
            copy.requestCancelled = storage.requestCancelled
            copy.requestPending = storage.requestPending
            copy.turnTerminal = storage.turnTerminal
            copy.turnCompletedAt = storage.turnCompletedAt
            copy.savedSteps = storage.savedSteps
            copy.png = storage.png
            copy.mime = storage.mime
            copy.parentId = storage.parentId
            copy.replyToId = storage.replyToId
            copy.sendId = storage.sendId
            copy.channelMode = storage.channelMode
            copy.from = storage.from
            copy.threadPost = storage.threadPost
            copy.peerPost = storage.peerPost
            copy.routedBy = storage.routedBy
            copy.quickModel = storage.quickModel
            copy.doneWhen = storage.doneWhen
            copy.peerAsk = storage.peerAsk
            copy.reactions = storage.reactions
            copy.reaction = storage.reaction
            copy.comm = storage.comm
            copy.relay = storage.relay
            copy.inbox = storage.inbox
            copy.threadRef = storage.threadRef
            copy.sentDirectly = storage.sentDirectly
            copy.publishedPage = storage.publishedPage
            copy.dataResult = storage.dataResult
            copy.dataContext = storage.dataContext
            copy.queued = storage.queued
            copy.queueId = storage.queueId
            copy.additionalFields = storage.additionalFields
            copy.explicitNulls = storage.explicitNulls
            storage = copy
        }
    }

    public var `textCode`: String? {
        get { storage.`textCode` }
        set { ensureUniqueStorage(); storage.`textCode` = newValue }
    }

    public var `textParams`: ServerTextParams? {
        get { storage.`textParams` }
        set { ensureUniqueStorage(); storage.`textParams` = newValue }
    }

    public var `helperFollowup`: HelperFollowupFacts? {
        get { storage.`helperFollowup` }
        set { ensureUniqueStorage(); storage.`helperFollowup` = newValue }
    }

    public var `helperIntro`: Bool? {
        get { storage.`helperIntro` }
        set { ensureUniqueStorage(); storage.`helperIntro` = newValue }
    }

    public var `setupOffer`: Bool? {
        get { storage.`setupOffer` }
        set { ensureUniqueStorage(); storage.`setupOffer` = newValue }
    }

    public var `setupChoices`: [String]? {
        get { storage.`setupChoices` }
        set { ensureUniqueStorage(); storage.`setupChoices` = newValue }
    }

    public var `setupChoicesPending`: Bool? {
        get { storage.`setupChoicesPending` }
        set { ensureUniqueStorage(); storage.`setupChoicesPending` = newValue }
    }

    public var `setupChoicesUpdating`: Double? {
        get { storage.`setupChoicesUpdating` }
        set { ensureUniqueStorage(); storage.`setupChoicesUpdating` = newValue }
    }

    public var `wait`: WaitLine? {
        get { storage.`wait` }
        set { ensureUniqueStorage(); storage.`wait` = newValue }
    }

    public var `bugReport`: BugReportStatus? {
        get { storage.`bugReport` }
        set { ensureUniqueStorage(); storage.`bugReport` = newValue }
    }

    public var `roomRequest`: WireMessageFieldsRoomRequest? {
        get { storage.`roomRequest` }
        set { ensureUniqueStorage(); storage.`roomRequest` = newValue }
    }

    public var `id`: String {
        get { storage.`id` }
        set { ensureUniqueStorage(); storage.`id` = newValue }
    }

    public var `role`: WireMessageFieldsRole {
        get { storage.`role` }
        set { ensureUniqueStorage(); storage.`role` = newValue }
    }

    public var `text`: String? {
        get { storage.`text` }
        set { ensureUniqueStorage(); storage.`text` = newValue }
    }

    public var `digest`: TurnDigest? {
        get { storage.`digest` }
        set { ensureUniqueStorage(); storage.`digest` = newValue }
    }

    public var `engineCompaction`: Bool? {
        get { storage.`engineCompaction` }
        set { ensureUniqueStorage(); storage.`engineCompaction` = newValue }
    }

    public var `compaction`: WireMessageFieldsCompaction? {
        get { storage.`compaction` }
        set { ensureUniqueStorage(); storage.`compaction` = newValue }
    }

    public var `attachments`: [WireAttachment]? {
        get { storage.`attachments` }
        set { ensureUniqueStorage(); storage.`attachments` = newValue }
    }

    public var `card`: OptionCardData? {
        get { storage.`card` }
        set { ensureUniqueStorage(); storage.`card` = newValue }
    }

    public var `widget`: WidgetPayload? {
        get { storage.`widget` }
        set { ensureUniqueStorage(); storage.`widget` = newValue }
    }

    public var `serverCard`: Bool? {
        get { storage.`serverCard` }
        set { ensureUniqueStorage(); storage.`serverCard` = newValue }
    }

    public var `setupSuggestion`: WireMessageFieldsSetupSuggestion? {
        get { storage.`setupSuggestion` }
        set { ensureUniqueStorage(); storage.`setupSuggestion` = newValue }
    }

    public var `setupRequest`: Bool? {
        get { storage.`setupRequest` }
        set { ensureUniqueStorage(); storage.`setupRequest` = newValue }
    }

    public var `app`: AppPayload? {
        get { storage.`app` }
        set { ensureUniqueStorage(); storage.`app` = newValue }
    }

    public var `fromApp`: AppFromRef? {
        get { storage.`fromApp` }
        set { ensureUniqueStorage(); storage.`fromApp` = newValue }
    }

    public var `pointed`: [AppPointedRef]? {
        get { storage.`pointed` }
        set { ensureUniqueStorage(); storage.`pointed` = newValue }
    }

    public var `connector`: ConnectorCardData? {
        get { storage.`connector` }
        set { ensureUniqueStorage(); storage.`connector` = newValue }
    }

    public var `secret`: SecretRequestCardData? {
        get { storage.`secret` }
        set { ensureUniqueStorage(); storage.`secret` = newValue }
    }

    public var `signIn`: SignInRequestCardData? {
        get { storage.`signIn` }
        set { ensureUniqueStorage(); storage.`signIn` = newValue }
    }

    public var `routineRun`: RoutineRunCardData? {
        get { storage.`routineRun` }
        set { ensureUniqueStorage(); storage.`routineRun` = newValue }
    }

    public var `burst`: BurstCardData? {
        get { storage.`burst` }
        set { ensureUniqueStorage(); storage.`burst` = newValue }
    }

    public var `automation`: AutomationLine? {
        get { storage.`automation` }
        set { ensureUniqueStorage(); storage.`automation` = newValue }
    }

    public var `goalRun`: GroupGoalRunCardData? {
        get { storage.`goalRun` }
        set { ensureUniqueStorage(); storage.`goalRun` = newValue }
    }

    public var `call`: LiveCallRecord? {
        get { storage.`call` }
        set { ensureUniqueStorage(); storage.`call` = newValue }
    }

    public var `tool`: WireMessageFieldsTool? {
        get { storage.`tool` }
        set { ensureUniqueStorage(); storage.`tool` = newValue }
    }

    public var `webhookPost`: Bool? {
        get { storage.`webhookPost` }
        set { ensureUniqueStorage(); storage.`webhookPost` = newValue }
    }

    public var `steered`: Bool? {
        get { storage.`steered` }
        set { ensureUniqueStorage(); storage.`steered` = newValue }
    }

    public var `aside`: Bool? {
        get { storage.`aside` }
        set { ensureUniqueStorage(); storage.`aside` = newValue }
    }

    public var `via`: WireMessageFieldsVia? {
        get { storage.`via` }
        set { ensureUniqueStorage(); storage.`via` = newValue }
    }

    public var `callId`: String? {
        get { storage.`callId` }
        set { ensureUniqueStorage(); storage.`callId` = newValue }
    }

    public var `relayed`: Bool? {
        get { storage.`relayed` }
        set { ensureUniqueStorage(); storage.`relayed` = newValue }
    }

    public var `sender`: ResolvedSender? {
        get { storage.`sender` }
        set { ensureUniqueStorage(); storage.`sender` = newValue }
    }

    public var `turnId`: String? {
        get { storage.`turnId` }
        set { ensureUniqueStorage(); storage.`turnId` = newValue }
    }

    public var `stoppedBy`: ResolvedSender? {
        get { storage.`stoppedBy` }
        set { ensureUniqueStorage(); storage.`stoppedBy` = newValue }
    }

    public var `itemId`: String? {
        get { storage.`itemId` }
        set { ensureUniqueStorage(); storage.`itemId` = newValue }
    }

    public var `requestMessageId`: String? {
        get { storage.`requestMessageId` }
        set { ensureUniqueStorage(); storage.`requestMessageId` = newValue }
    }

    public var `turnSucceeded`: Bool? {
        get { storage.`turnSucceeded` }
        set { ensureUniqueStorage(); storage.`turnSucceeded` = newValue }
    }

    public var `requestCancelled`: Bool? {
        get { storage.`requestCancelled` }
        set { ensureUniqueStorage(); storage.`requestCancelled` = newValue }
    }

    public var `requestPending`: Bool? {
        get { storage.`requestPending` }
        set { ensureUniqueStorage(); storage.`requestPending` = newValue }
    }

    public var `turnTerminal`: Bool? {
        get { storage.`turnTerminal` }
        set { ensureUniqueStorage(); storage.`turnTerminal` = newValue }
    }

    public var `turnCompletedAt`: Double? {
        get { storage.`turnCompletedAt` }
        set { ensureUniqueStorage(); storage.`turnCompletedAt` = newValue }
    }

    public var `savedSteps`: SavedStepsMark? {
        get { storage.`savedSteps` }
        set { ensureUniqueStorage(); storage.`savedSteps` = newValue }
    }

    public var `png`: String? {
        get { storage.`png` }
        set { ensureUniqueStorage(); storage.`png` = newValue }
    }

    public var `mime`: String? {
        get { storage.`mime` }
        set { ensureUniqueStorage(); storage.`mime` = newValue }
    }

    public var `at`: Double {
        get { storage.`at` }
        set { ensureUniqueStorage(); storage.`at` = newValue }
    }

    public var `parentId`: String? {
        get { storage.`parentId` }
        set { ensureUniqueStorage(); storage.`parentId` = newValue }
    }

    public var `replyToId`: String? {
        get { storage.`replyToId` }
        set { ensureUniqueStorage(); storage.`replyToId` = newValue }
    }

    public var `sendId`: String? {
        get { storage.`sendId` }
        set { ensureUniqueStorage(); storage.`sendId` = newValue }
    }

    public var `channelMode`: WireMessageFieldsChannelMode? {
        get { storage.`channelMode` }
        set { ensureUniqueStorage(); storage.`channelMode` = newValue }
    }

    public var `from`: WireMessageFieldsFrom? {
        get { storage.`from` }
        set { ensureUniqueStorage(); storage.`from` = newValue }
    }

    public var `threadPost`: WireMessageFieldsThreadPost? {
        get { storage.`threadPost` }
        set { ensureUniqueStorage(); storage.`threadPost` = newValue }
    }

    public var `peerPost`: WireMessageFieldsPeerPost? {
        get { storage.`peerPost` }
        set { ensureUniqueStorage(); storage.`peerPost` = newValue }
    }

    public var `routedBy`: WireMessageFieldsRoutedBy? {
        get { storage.`routedBy` }
        set { ensureUniqueStorage(); storage.`routedBy` = newValue }
    }

    public var `quickModel`: String? {
        get { storage.`quickModel` }
        set { ensureUniqueStorage(); storage.`quickModel` = newValue }
    }

    public var `doneWhen`: String? {
        get { storage.`doneWhen` }
        set { ensureUniqueStorage(); storage.`doneWhen` = newValue }
    }

    public var `peerAsk`: WireMessageFieldsPeerAsk? {
        get { storage.`peerAsk` }
        set { ensureUniqueStorage(); storage.`peerAsk` = newValue }
    }

    public var `reactions`: [WireMessageFieldsReactionsElement]? {
        get { storage.`reactions` }
        set { ensureUniqueStorage(); storage.`reactions` = newValue }
    }

    public var `reaction`: String? {
        get { storage.`reaction` }
        set { ensureUniqueStorage(); storage.`reaction` = newValue }
    }

    public var `comm`: WireMessageFieldsComm? {
        get { storage.`comm` }
        set { ensureUniqueStorage(); storage.`comm` = newValue }
    }

    public var `relay`: WireMessageFieldsRelay? {
        get { storage.`relay` }
        set { ensureUniqueStorage(); storage.`relay` = newValue }
    }

    public var `inbox`: InboxItem? {
        get { storage.`inbox` }
        set { ensureUniqueStorage(); storage.`inbox` = newValue }
    }

    public var `threadRef`: WireMessageFieldsThreadRef? {
        get { storage.`threadRef` }
        set { ensureUniqueStorage(); storage.`threadRef` = newValue }
    }

    public var `sentDirectly`: WireMessageFieldsSentDirectly? {
        get { storage.`sentDirectly` }
        set { ensureUniqueStorage(); storage.`sentDirectly` = newValue }
    }

    public var `publishedPage`: PublishedPageCard? {
        get { storage.`publishedPage` }
        set { ensureUniqueStorage(); storage.`publishedPage` = newValue }
    }

    public var `dataResult`: WireMessageFieldsDataResult? {
        get { storage.`dataResult` }
        set { ensureUniqueStorage(); storage.`dataResult` = newValue }
    }

    public var `dataContext`: WireMessageFieldsDataContext? {
        get { storage.`dataContext` }
        set { ensureUniqueStorage(); storage.`dataContext` = newValue }
    }

    public var `queued`: Bool? {
        get { storage.`queued` }
        set { ensureUniqueStorage(); storage.`queued` = newValue }
    }

    public var `queueId`: String? {
        get { storage.`queueId` }
        set { ensureUniqueStorage(); storage.`queueId` = newValue }
    }
    public var additionalFields: [String: JSONValue] {
        get { storage.additionalFields }
        set { ensureUniqueStorage(); storage.additionalFields = newValue }
    }
    private var explicitNulls: Set<String> {
        get { storage.explicitNulls }
        set { ensureUniqueStorage(); storage.explicitNulls = newValue }
    }
    public init(
        `id`: String,
        `role`: WireMessageFieldsRole,
        `at`: Double,
        `textCode`: String? = nil,
        `textParams`: ServerTextParams? = nil,
        `helperFollowup`: HelperFollowupFacts? = nil,
        `helperIntro`: Bool? = nil,
        `setupOffer`: Bool? = nil,
        `setupChoices`: [String]? = nil,
        `setupChoicesPending`: Bool? = nil,
        `setupChoicesUpdating`: Double? = nil,
        `wait`: WaitLine? = nil,
        `bugReport`: BugReportStatus? = nil,
        `roomRequest`: WireMessageFieldsRoomRequest? = nil,
        `text`: String? = nil,
        `digest`: TurnDigest? = nil,
        `engineCompaction`: Bool? = nil,
        `compaction`: WireMessageFieldsCompaction? = nil,
        `attachments`: [WireAttachment]? = nil,
        `card`: OptionCardData? = nil,
        `widget`: WidgetPayload? = nil,
        `serverCard`: Bool? = nil,
        `setupSuggestion`: WireMessageFieldsSetupSuggestion? = nil,
        `setupRequest`: Bool? = nil,
        `app`: AppPayload? = nil,
        `fromApp`: AppFromRef? = nil,
        `pointed`: [AppPointedRef]? = nil,
        `connector`: ConnectorCardData? = nil,
        `secret`: SecretRequestCardData? = nil,
        `signIn`: SignInRequestCardData? = nil,
        `routineRun`: RoutineRunCardData? = nil,
        `burst`: BurstCardData? = nil,
        `automation`: AutomationLine? = nil,
        `goalRun`: GroupGoalRunCardData? = nil,
        `call`: LiveCallRecord? = nil,
        `tool`: WireMessageFieldsTool? = nil,
        `webhookPost`: Bool? = nil,
        `steered`: Bool? = nil,
        `aside`: Bool? = nil,
        `via`: WireMessageFieldsVia? = nil,
        `callId`: String? = nil,
        `relayed`: Bool? = nil,
        `sender`: ResolvedSender? = nil,
        `turnId`: String? = nil,
        `stoppedBy`: ResolvedSender? = nil,
        `itemId`: String? = nil,
        `requestMessageId`: String? = nil,
        `turnSucceeded`: Bool? = nil,
        `requestCancelled`: Bool? = nil,
        `requestPending`: Bool? = nil,
        `turnTerminal`: Bool? = nil,
        `turnCompletedAt`: Double? = nil,
        `savedSteps`: SavedStepsMark? = nil,
        `png`: String? = nil,
        `mime`: String? = nil,
        `parentId`: String? = nil,
        `replyToId`: String? = nil,
        `sendId`: String? = nil,
        `channelMode`: WireMessageFieldsChannelMode? = nil,
        `from`: WireMessageFieldsFrom? = nil,
        `threadPost`: WireMessageFieldsThreadPost? = nil,
        `peerPost`: WireMessageFieldsPeerPost? = nil,
        `routedBy`: WireMessageFieldsRoutedBy? = nil,
        `quickModel`: String? = nil,
        `doneWhen`: String? = nil,
        `peerAsk`: WireMessageFieldsPeerAsk? = nil,
        `reactions`: [WireMessageFieldsReactionsElement]? = nil,
        `reaction`: String? = nil,
        `comm`: WireMessageFieldsComm? = nil,
        `relay`: WireMessageFieldsRelay? = nil,
        `inbox`: InboxItem? = nil,
        `threadRef`: WireMessageFieldsThreadRef? = nil,
        `sentDirectly`: WireMessageFieldsSentDirectly? = nil,
        `publishedPage`: PublishedPageCard? = nil,
        `dataResult`: WireMessageFieldsDataResult? = nil,
        `dataContext`: WireMessageFieldsDataContext? = nil,
        `queued`: Bool? = nil,
        `queueId`: String? = nil
    ) {
        self.storage = Storage(id: `id`, role: `role`, at: `at`)
        self.`textCode` = `textCode`
        self.`textParams` = `textParams`
        self.`helperFollowup` = `helperFollowup`
        self.`helperIntro` = `helperIntro`
        self.`setupOffer` = `setupOffer`
        self.`setupChoices` = `setupChoices`
        self.`setupChoicesPending` = `setupChoicesPending`
        self.`setupChoicesUpdating` = `setupChoicesUpdating`
        self.`wait` = `wait`
        self.`bugReport` = `bugReport`
        self.`roomRequest` = `roomRequest`
        self.`id` = `id`
        self.`role` = `role`
        self.`text` = `text`
        self.`digest` = `digest`
        self.`engineCompaction` = `engineCompaction`
        self.`compaction` = `compaction`
        self.`attachments` = `attachments`
        self.`card` = `card`
        self.`widget` = `widget`
        self.`serverCard` = `serverCard`
        self.`setupSuggestion` = `setupSuggestion`
        self.`setupRequest` = `setupRequest`
        self.`app` = `app`
        self.`fromApp` = `fromApp`
        self.`pointed` = `pointed`
        self.`connector` = `connector`
        self.`secret` = `secret`
        self.`signIn` = `signIn`
        self.`routineRun` = `routineRun`
        self.`burst` = `burst`
        self.`automation` = `automation`
        self.`goalRun` = `goalRun`
        self.`call` = `call`
        self.`tool` = `tool`
        self.`webhookPost` = `webhookPost`
        self.`steered` = `steered`
        self.`aside` = `aside`
        self.`via` = `via`
        self.`callId` = `callId`
        self.`relayed` = `relayed`
        self.`sender` = `sender`
        self.`turnId` = `turnId`
        self.`stoppedBy` = `stoppedBy`
        self.`itemId` = `itemId`
        self.`requestMessageId` = `requestMessageId`
        self.`turnSucceeded` = `turnSucceeded`
        self.`requestCancelled` = `requestCancelled`
        self.`requestPending` = `requestPending`
        self.`turnTerminal` = `turnTerminal`
        self.`turnCompletedAt` = `turnCompletedAt`
        self.`savedSteps` = `savedSteps`
        self.`png` = `png`
        self.`mime` = `mime`
        self.`at` = `at`
        self.`parentId` = `parentId`
        self.`replyToId` = `replyToId`
        self.`sendId` = `sendId`
        self.`channelMode` = `channelMode`
        self.`from` = `from`
        self.`threadPost` = `threadPost`
        self.`peerPost` = `peerPost`
        self.`routedBy` = `routedBy`
        self.`quickModel` = `quickModel`
        self.`doneWhen` = `doneWhen`
        self.`peerAsk` = `peerAsk`
        self.`reactions` = `reactions`
        self.`reaction` = `reaction`
        self.`comm` = `comm`
        self.`relay` = `relay`
        self.`inbox` = `inbox`
        self.`threadRef` = `threadRef`
        self.`sentDirectly` = `sentDirectly`
        self.`publishedPage` = `publishedPage`
        self.`dataResult` = `dataResult`
        self.`dataContext` = `dataContext`
        self.`queued` = `queued`
        self.`queueId` = `queueId`
    }

    @inline(never)
    public init(from decoder: Decoder) throws {
        self.storage = Storage(id: "", role: .user, at: 0)
        let object = try WireObject(from: decoder)
        `textCode` = try object.optional("textCode")
        `textParams` = try object.optional("textParams")
        `helperFollowup` = try object.optional("helperFollowup")
        `helperIntro` = try object.optional("helperIntro")
        `setupOffer` = try object.optional("setupOffer")
        `setupChoices` = try object.optional("setupChoices")
        `setupChoicesPending` = try object.optional("setupChoicesPending")
        `setupChoicesUpdating` = try object.optional("setupChoicesUpdating")
        `wait` = try object.optional("wait")
        `bugReport` = try object.optional("bugReport")
        `roomRequest` = try object.optional("roomRequest")
        `id` = try object.required("id")
        `role` = try object.required("role")
        `text` = try object.optional("text")
        `digest` = try object.optional("digest")
        `engineCompaction` = try object.optional("engineCompaction")
        `compaction` = try object.optional("compaction")
        `attachments` = try object.optional("attachments")
        `card` = try object.optional("card")
        `widget` = try object.optional("widget")
        `serverCard` = try object.optional("serverCard")
        `setupSuggestion` = try object.optional("setupSuggestion")
        `setupRequest` = try object.optional("setupRequest")
        `app` = try object.optional("app")
        `fromApp` = try object.optional("fromApp")
        `pointed` = try object.optional("pointed")
        `connector` = try object.optional("connector")
        `secret` = try object.optional("secret")
        `signIn` = try object.optional("signIn")
        `routineRun` = try object.optional("routineRun")
        `burst` = try object.optional("burst")
        `automation` = try object.optional("automation")
        `goalRun` = try object.optional("goalRun")
        `call` = try object.optional("call")
        `tool` = try object.optional("tool")
        `webhookPost` = try object.optional("webhookPost")
        `steered` = try object.optional("steered")
        `aside` = try object.optional("aside")
        `via` = try object.optional("via")
        `callId` = try object.optional("callId")
        `relayed` = try object.optional("relayed")
        `sender` = try object.optional("sender")
        `turnId` = try object.optional("turnId")
        `stoppedBy` = try object.optional("stoppedBy")
        `itemId` = try object.optional("itemId")
        `requestMessageId` = try object.optional("requestMessageId")
        `turnSucceeded` = try object.optional("turnSucceeded")
        `requestCancelled` = try object.optional("requestCancelled")
        `requestPending` = try object.optional("requestPending")
        `turnTerminal` = try object.optional("turnTerminal")
        `turnCompletedAt` = try object.optional("turnCompletedAt")
        `savedSteps` = try object.optional("savedSteps")
        `png` = try object.optional("png")
        `mime` = try object.optional("mime")
        `at` = try object.required("at")
        `parentId` = try object.optional("parentId")
        `replyToId` = try object.optional("replyToId")
        `sendId` = try object.optional("sendId")
        `channelMode` = try object.optional("channelMode")
        `from` = try object.optional("from")
        `threadPost` = try object.optional("threadPost")
        `peerPost` = try object.optional("peerPost")
        `routedBy` = try object.optional("routedBy")
        `quickModel` = try object.optional("quickModel")
        `doneWhen` = try object.optional("doneWhen")
        `peerAsk` = try object.optional("peerAsk")
        `reactions` = try object.optional("reactions")
        `reaction` = try object.optional("reaction")
        `comm` = try object.optional("comm")
        `relay` = try object.optional("relay")
        `inbox` = try object.optional("inbox")
        `threadRef` = try object.optional("threadRef")
        `sentDirectly` = try object.optional("sentDirectly")
        `publishedPage` = try object.optional("publishedPage")
        `dataResult` = try object.optional("dataResult")
        `dataContext` = try object.optional("dataContext")
        `queued` = try object.optional("queued")
        `queueId` = try object.optional("queueId")
        additionalFields = object.remainder(excluding: ["textCode", "textParams", "helperFollowup", "helperIntro", "setupOffer", "setupChoices", "setupChoicesPending", "setupChoicesUpdating", "wait", "bugReport", "roomRequest", "id", "role", "text", "digest", "engineCompaction", "compaction", "attachments", "card", "widget", "serverCard", "setupSuggestion", "setupRequest", "app", "fromApp", "pointed", "connector", "secret", "signIn", "routineRun", "burst", "automation", "goalRun", "call", "tool", "webhookPost", "steered", "aside", "via", "callId", "relayed", "sender", "turnId", "stoppedBy", "itemId", "requestMessageId", "turnSucceeded", "requestCancelled", "requestPending", "turnTerminal", "turnCompletedAt", "savedSteps", "png", "mime", "at", "parentId", "replyToId", "sendId", "channelMode", "from", "threadPost", "peerPost", "routedBy", "quickModel", "doneWhen", "peerAsk", "reactions", "reaction", "comm", "relay", "inbox", "threadRef", "sentDirectly", "publishedPage", "dataResult", "dataContext", "queued", "queueId"])
        explicitNulls = object.nullKeys.intersection(["textCode", "textParams", "helperFollowup", "helperIntro", "setupOffer", "setupChoices", "setupChoicesPending", "setupChoicesUpdating", "wait", "bugReport", "roomRequest", "id", "role", "text", "digest", "engineCompaction", "compaction", "attachments", "card", "widget", "serverCard", "setupSuggestion", "setupRequest", "app", "fromApp", "pointed", "connector", "secret", "signIn", "routineRun", "burst", "automation", "goalRun", "call", "tool", "webhookPost", "steered", "aside", "via", "callId", "relayed", "sender", "turnId", "stoppedBy", "itemId", "requestMessageId", "turnSucceeded", "requestCancelled", "requestPending", "turnTerminal", "turnCompletedAt", "savedSteps", "png", "mime", "at", "parentId", "replyToId", "sendId", "channelMode", "from", "threadPost", "peerPost", "routedBy", "quickModel", "doneWhen", "peerAsk", "reactions", "reaction", "comm", "relay", "inbox", "threadRef", "sentDirectly", "publishedPage", "dataResult", "dataContext", "queued", "queueId"])
    }

    public static func == (lhs: WireMessageFields, rhs: WireMessageFields) -> Bool {
        lhs.`textCode` == rhs.`textCode` &&
        lhs.`textParams` == rhs.`textParams` &&
        lhs.`helperFollowup` == rhs.`helperFollowup` &&
        lhs.`helperIntro` == rhs.`helperIntro` &&
        lhs.`setupOffer` == rhs.`setupOffer` &&
        lhs.`setupChoices` == rhs.`setupChoices` &&
        lhs.`setupChoicesPending` == rhs.`setupChoicesPending` &&
        lhs.`setupChoicesUpdating` == rhs.`setupChoicesUpdating` &&
        lhs.`wait` == rhs.`wait` &&
        lhs.`bugReport` == rhs.`bugReport` &&
        lhs.`roomRequest` == rhs.`roomRequest` &&
        lhs.`id` == rhs.`id` &&
        lhs.`role` == rhs.`role` &&
        lhs.`text` == rhs.`text` &&
        lhs.`digest` == rhs.`digest` &&
        lhs.`engineCompaction` == rhs.`engineCompaction` &&
        lhs.`compaction` == rhs.`compaction` &&
        lhs.`attachments` == rhs.`attachments` &&
        lhs.`card` == rhs.`card` &&
        lhs.`widget` == rhs.`widget` &&
        lhs.`serverCard` == rhs.`serverCard` &&
        lhs.`setupSuggestion` == rhs.`setupSuggestion` &&
        lhs.`setupRequest` == rhs.`setupRequest` &&
        lhs.`app` == rhs.`app` &&
        lhs.`fromApp` == rhs.`fromApp` &&
        lhs.`pointed` == rhs.`pointed` &&
        lhs.`connector` == rhs.`connector` &&
        lhs.`secret` == rhs.`secret` &&
        lhs.`signIn` == rhs.`signIn` &&
        lhs.`routineRun` == rhs.`routineRun` &&
        lhs.`burst` == rhs.`burst` &&
        lhs.`automation` == rhs.`automation` &&
        lhs.`goalRun` == rhs.`goalRun` &&
        lhs.`call` == rhs.`call` &&
        lhs.`tool` == rhs.`tool` &&
        lhs.`webhookPost` == rhs.`webhookPost` &&
        lhs.`steered` == rhs.`steered` &&
        lhs.`aside` == rhs.`aside` &&
        lhs.`via` == rhs.`via` &&
        lhs.`callId` == rhs.`callId` &&
        lhs.`relayed` == rhs.`relayed` &&
        lhs.`sender` == rhs.`sender` &&
        lhs.`turnId` == rhs.`turnId` &&
        lhs.`stoppedBy` == rhs.`stoppedBy` &&
        lhs.`itemId` == rhs.`itemId` &&
        lhs.`requestMessageId` == rhs.`requestMessageId` &&
        lhs.`turnSucceeded` == rhs.`turnSucceeded` &&
        lhs.`requestCancelled` == rhs.`requestCancelled` &&
        lhs.`requestPending` == rhs.`requestPending` &&
        lhs.`turnTerminal` == rhs.`turnTerminal` &&
        lhs.`turnCompletedAt` == rhs.`turnCompletedAt` &&
        lhs.`savedSteps` == rhs.`savedSteps` &&
        lhs.`png` == rhs.`png` &&
        lhs.`mime` == rhs.`mime` &&
        lhs.`at` == rhs.`at` &&
        lhs.`parentId` == rhs.`parentId` &&
        lhs.`replyToId` == rhs.`replyToId` &&
        lhs.`sendId` == rhs.`sendId` &&
        lhs.`channelMode` == rhs.`channelMode` &&
        lhs.`from` == rhs.`from` &&
        lhs.`threadPost` == rhs.`threadPost` &&
        lhs.`peerPost` == rhs.`peerPost` &&
        lhs.`routedBy` == rhs.`routedBy` &&
        lhs.`quickModel` == rhs.`quickModel` &&
        lhs.`doneWhen` == rhs.`doneWhen` &&
        lhs.`peerAsk` == rhs.`peerAsk` &&
        lhs.`reactions` == rhs.`reactions` &&
        lhs.`reaction` == rhs.`reaction` &&
        lhs.`comm` == rhs.`comm` &&
        lhs.`relay` == rhs.`relay` &&
        lhs.`inbox` == rhs.`inbox` &&
        lhs.`threadRef` == rhs.`threadRef` &&
        lhs.`sentDirectly` == rhs.`sentDirectly` &&
        lhs.`publishedPage` == rhs.`publishedPage` &&
        lhs.`dataResult` == rhs.`dataResult` &&
        lhs.`dataContext` == rhs.`dataContext` &&
        lhs.`queued` == rhs.`queued` &&
        lhs.`queueId` == rhs.`queueId` &&
        lhs.additionalFields == rhs.additionalFields &&
        lhs.explicitNulls == rhs.explicitNulls
    }

    @inline(never)
    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("textCode", `textCode`, nulls: explicitNulls)
        try object.putOptional("textParams", `textParams`, nulls: explicitNulls)
        try object.putOptional("helperFollowup", `helperFollowup`, nulls: explicitNulls)
        try object.putOptional("helperIntro", `helperIntro`, nulls: explicitNulls)
        try object.putOptional("setupOffer", `setupOffer`, nulls: explicitNulls)
        try object.putOptional("setupChoices", `setupChoices`, nulls: explicitNulls)
        try object.putOptional("setupChoicesPending", `setupChoicesPending`, nulls: explicitNulls)
        try object.putOptional("setupChoicesUpdating", `setupChoicesUpdating`, nulls: explicitNulls)
        try object.putOptional("wait", `wait`, nulls: explicitNulls)
        try object.putOptional("bugReport", `bugReport`, nulls: explicitNulls)
        try object.putOptional("roomRequest", `roomRequest`, nulls: explicitNulls)
        try object.put("id", `id`)
        try object.put("role", `role`)
        try object.putOptional("text", `text`, nulls: explicitNulls)
        try object.putOptional("digest", `digest`, nulls: explicitNulls)
        try object.putOptional("engineCompaction", `engineCompaction`, nulls: explicitNulls)
        try object.putOptional("compaction", `compaction`, nulls: explicitNulls)
        try object.putOptional("attachments", `attachments`, nulls: explicitNulls)
        try object.putOptional("card", `card`, nulls: explicitNulls)
        try object.putOptional("widget", `widget`, nulls: explicitNulls)
        try object.putOptional("serverCard", `serverCard`, nulls: explicitNulls)
        try object.putOptional("setupSuggestion", `setupSuggestion`, nulls: explicitNulls)
        try object.putOptional("setupRequest", `setupRequest`, nulls: explicitNulls)
        try object.putOptional("app", `app`, nulls: explicitNulls)
        try object.putOptional("fromApp", `fromApp`, nulls: explicitNulls)
        try object.putOptional("pointed", `pointed`, nulls: explicitNulls)
        try object.putOptional("connector", `connector`, nulls: explicitNulls)
        try object.putOptional("secret", `secret`, nulls: explicitNulls)
        try object.putOptional("signIn", `signIn`, nulls: explicitNulls)
        try object.putOptional("routineRun", `routineRun`, nulls: explicitNulls)
        try object.putOptional("burst", `burst`, nulls: explicitNulls)
        try object.putOptional("automation", `automation`, nulls: explicitNulls)
        try object.putOptional("goalRun", `goalRun`, nulls: explicitNulls)
        try object.putOptional("call", `call`, nulls: explicitNulls)
        try object.putOptional("tool", `tool`, nulls: explicitNulls)
        try object.putOptional("webhookPost", `webhookPost`, nulls: explicitNulls)
        try object.putOptional("steered", `steered`, nulls: explicitNulls)
        try object.putOptional("aside", `aside`, nulls: explicitNulls)
        try object.putOptional("via", `via`, nulls: explicitNulls)
        try object.putOptional("callId", `callId`, nulls: explicitNulls)
        try object.putOptional("relayed", `relayed`, nulls: explicitNulls)
        try object.putOptional("sender", `sender`, nulls: explicitNulls)
        try object.putOptional("turnId", `turnId`, nulls: explicitNulls)
        try object.putOptional("stoppedBy", `stoppedBy`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("requestMessageId", `requestMessageId`, nulls: explicitNulls)
        try object.putOptional("turnSucceeded", `turnSucceeded`, nulls: explicitNulls)
        try object.putOptional("requestCancelled", `requestCancelled`, nulls: explicitNulls)
        try object.putOptional("requestPending", `requestPending`, nulls: explicitNulls)
        try object.putOptional("turnTerminal", `turnTerminal`, nulls: explicitNulls)
        try object.putOptional("turnCompletedAt", `turnCompletedAt`, nulls: explicitNulls)
        try object.putOptional("savedSteps", `savedSteps`, nulls: explicitNulls)
        try object.putOptional("png", `png`, nulls: explicitNulls)
        try object.putOptional("mime", `mime`, nulls: explicitNulls)
        try object.put("at", `at`)
        try object.putOptional("parentId", `parentId`, nulls: explicitNulls)
        try object.putOptional("replyToId", `replyToId`, nulls: explicitNulls)
        try object.putOptional("sendId", `sendId`, nulls: explicitNulls)
        try object.putOptional("channelMode", `channelMode`, nulls: explicitNulls)
        try object.putOptional("from", `from`, nulls: explicitNulls)
        try object.putOptional("threadPost", `threadPost`, nulls: explicitNulls)
        try object.putOptional("peerPost", `peerPost`, nulls: explicitNulls)
        try object.putOptional("routedBy", `routedBy`, nulls: explicitNulls)
        try object.putOptional("quickModel", `quickModel`, nulls: explicitNulls)
        try object.putOptional("doneWhen", `doneWhen`, nulls: explicitNulls)
        try object.putOptional("peerAsk", `peerAsk`, nulls: explicitNulls)
        try object.putOptional("reactions", `reactions`, nulls: explicitNulls)
        try object.putOptional("reaction", `reaction`, nulls: explicitNulls)
        try object.putOptional("comm", `comm`, nulls: explicitNulls)
        try object.putOptional("relay", `relay`, nulls: explicitNulls)
        try object.putOptional("inbox", `inbox`, nulls: explicitNulls)
        try object.putOptional("threadRef", `threadRef`, nulls: explicitNulls)
        try object.putOptional("sentDirectly", `sentDirectly`, nulls: explicitNulls)
        try object.putOptional("publishedPage", `publishedPage`, nulls: explicitNulls)
        try object.putOptional("dataResult", `dataResult`, nulls: explicitNulls)
        try object.putOptional("dataContext", `dataContext`, nulls: explicitNulls)
        try object.putOptional("queued", `queued`, nulls: explicitNulls)
        try object.putOptional("queueId", `queueId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WireMessageFieldsRoomRequest: WireModel {
    public var `id`: String
    public var `phase`: WireMessageFieldsRoomRequestPhase
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`id`: String, `phase`: WireMessageFieldsRoomRequestPhase) {
        self.`id` = `id`
        self.`phase` = `phase`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `phase` = try object.required("phase")
        additionalFields = object.remainder(excluding: ["id", "phase"])
        explicitNulls = object.nullKeys.intersection(["id", "phase"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("phase", `phase`)
        try object.encode(to: encoder)
    }
}

public enum WireMessageFieldsRoomRequestPhase: WireModel, Hashable, Sendable {
    case `request`
    case `result`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "request": self = .`request`
        case "result": self = .`result`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`request`: return "request"
        case .`result`: return "result"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum WireMessageFieldsRole: WireModel, Hashable, Sendable {
    case `bot`
    case `user`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "bot": self = .`bot`
        case "user": self = .`user`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`bot`: return "bot"
        case .`user`: return "user"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct WireMessageFieldsCompaction: WireModel {
    public var `summary`: String
    public var `firstKeptId`: String
    public var `foldedThroughId`: String
    public var `tokensBefore`: Double
    public var `by`: WireMessageFieldsCompactionBy
    public var `fresh`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `summary`: String,
        `firstKeptId`: String,
        `foldedThroughId`: String,
        `tokensBefore`: Double,
        `by`: WireMessageFieldsCompactionBy,
        `fresh`: Bool? = nil
    ) {
        self.`summary` = `summary`
        self.`firstKeptId` = `firstKeptId`
        self.`foldedThroughId` = `foldedThroughId`
        self.`tokensBefore` = `tokensBefore`
        self.`by` = `by`
        self.`fresh` = `fresh`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `summary` = try object.required("summary")
        `firstKeptId` = try object.required("firstKeptId")
        `foldedThroughId` = try object.required("foldedThroughId")
        `tokensBefore` = try object.required("tokensBefore")
        `by` = try object.required("by")
        `fresh` = try object.optional("fresh")
        additionalFields = object.remainder(excluding: ["summary", "firstKeptId", "foldedThroughId", "tokensBefore", "by", "fresh"])
        explicitNulls = object.nullKeys.intersection(["summary", "firstKeptId", "foldedThroughId", "tokensBefore", "by", "fresh"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("summary", `summary`)
        try object.put("firstKeptId", `firstKeptId`)
        try object.put("foldedThroughId", `foldedThroughId`)
        try object.put("tokensBefore", `tokensBefore`)
        try object.put("by", `by`)
        try object.putOptional("fresh", `fresh`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum WireMessageFieldsCompactionBy: WireModel, Hashable, Sendable {
    case `person`
    case `harness`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "person": self = .`person`
        case "harness": self = .`harness`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`person`: return "person"
        case .`harness`: return "harness"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct OptionCardData: WireModel {
    public var `waitRequest`: WaitCardData?
    public var `computerAsk`: ComputerAskCard?
    public var `accessRequest`: OptionCardDataAccessRequest?
    public var `outsideWrite`: OptionCardDataOutsideWrite?
    public var `lendingLift`: OptionCardDataLendingLift?
    public var `outboundRequest`: OptionCardDataOutboundRequest?
    public var `teamMemoryRequest`: OptionCardDataTeamMemoryRequest?
    public var `title`: String
    public var `subtitle`: String
    public var `summaryCode`: String?
    public var `summaryParams`: ServerTextParams?
    public var `options`: [String]
    public var `requestType`: OptionCardDataRequestType?
    public var `answered`: String?
    public var `answeredText`: String?
    public var `dismissed`: Bool?
    public var `answeredBy`: CardAnswerer?
    public var `requestId`: String?
    public var `tool`: String?
    public var `held`: String?
    public var `expired`: Bool?
    public var `stopped`: Bool?
    public var `heldCode`: String?
    public var `allowKey`: String?
    public var `allowSession`: Bool?
    public var `commandAllowlist`: CommandAllowlistCandidate?
    public var `approvalScope`: String?
    public var `autoApplied`: Bool?
    public var `undone`: Bool?
    public var `routineRequest`: RoutineRequestCardData?
    public var `webhookRequest`: WebhookRequestCardData?
    public var `appTriggerRequest`: AppTriggerRequestCardData?
    public var `profileRequest`: ProfileRequestCardData?
    public var `modelRequest`: ModelRequestCardData?
    public var `teamSetupRequest`: TeamSetupRequest?
    public var `mcpRequest`: McpChangeRequest?
    public var `skillRequest`: SkillRequestCardData?
    public var `questionRequest`: QuestionRequestCardData?
    public var `fixedOptions`: Bool?
    public var `quotaSwitch`: QuotaSwitchCardData?
    public var `yourComputer`: OptionCardDataYourComputer?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `title`: String,
        `subtitle`: String,
        `options`: [String],
        `waitRequest`: WaitCardData? = nil,
        `computerAsk`: ComputerAskCard? = nil,
        `accessRequest`: OptionCardDataAccessRequest? = nil,
        `outsideWrite`: OptionCardDataOutsideWrite? = nil,
        `lendingLift`: OptionCardDataLendingLift? = nil,
        `outboundRequest`: OptionCardDataOutboundRequest? = nil,
        `teamMemoryRequest`: OptionCardDataTeamMemoryRequest? = nil,
        `summaryCode`: String? = nil,
        `summaryParams`: ServerTextParams? = nil,
        `requestType`: OptionCardDataRequestType? = nil,
        `answered`: String? = nil,
        `answeredText`: String? = nil,
        `dismissed`: Bool? = nil,
        `answeredBy`: CardAnswerer? = nil,
        `requestId`: String? = nil,
        `tool`: String? = nil,
        `held`: String? = nil,
        `expired`: Bool? = nil,
        `stopped`: Bool? = nil,
        `heldCode`: String? = nil,
        `allowKey`: String? = nil,
        `allowSession`: Bool? = nil,
        `commandAllowlist`: CommandAllowlistCandidate? = nil,
        `approvalScope`: String? = nil,
        `autoApplied`: Bool? = nil,
        `undone`: Bool? = nil,
        `routineRequest`: RoutineRequestCardData? = nil,
        `webhookRequest`: WebhookRequestCardData? = nil,
        `appTriggerRequest`: AppTriggerRequestCardData? = nil,
        `profileRequest`: ProfileRequestCardData? = nil,
        `modelRequest`: ModelRequestCardData? = nil,
        `teamSetupRequest`: TeamSetupRequest? = nil,
        `mcpRequest`: McpChangeRequest? = nil,
        `skillRequest`: SkillRequestCardData? = nil,
        `questionRequest`: QuestionRequestCardData? = nil,
        `fixedOptions`: Bool? = nil,
        `quotaSwitch`: QuotaSwitchCardData? = nil,
        `yourComputer`: OptionCardDataYourComputer? = nil
    ) {
        self.`waitRequest` = `waitRequest`
        self.`computerAsk` = `computerAsk`
        self.`accessRequest` = `accessRequest`
        self.`outsideWrite` = `outsideWrite`
        self.`lendingLift` = `lendingLift`
        self.`outboundRequest` = `outboundRequest`
        self.`teamMemoryRequest` = `teamMemoryRequest`
        self.`title` = `title`
        self.`subtitle` = `subtitle`
        self.`summaryCode` = `summaryCode`
        self.`summaryParams` = `summaryParams`
        self.`options` = `options`
        self.`requestType` = `requestType`
        self.`answered` = `answered`
        self.`answeredText` = `answeredText`
        self.`dismissed` = `dismissed`
        self.`answeredBy` = `answeredBy`
        self.`requestId` = `requestId`
        self.`tool` = `tool`
        self.`held` = `held`
        self.`expired` = `expired`
        self.`stopped` = `stopped`
        self.`heldCode` = `heldCode`
        self.`allowKey` = `allowKey`
        self.`allowSession` = `allowSession`
        self.`commandAllowlist` = `commandAllowlist`
        self.`approvalScope` = `approvalScope`
        self.`autoApplied` = `autoApplied`
        self.`undone` = `undone`
        self.`routineRequest` = `routineRequest`
        self.`webhookRequest` = `webhookRequest`
        self.`appTriggerRequest` = `appTriggerRequest`
        self.`profileRequest` = `profileRequest`
        self.`modelRequest` = `modelRequest`
        self.`teamSetupRequest` = `teamSetupRequest`
        self.`mcpRequest` = `mcpRequest`
        self.`skillRequest` = `skillRequest`
        self.`questionRequest` = `questionRequest`
        self.`fixedOptions` = `fixedOptions`
        self.`quotaSwitch` = `quotaSwitch`
        self.`yourComputer` = `yourComputer`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `waitRequest` = try object.optional("waitRequest")
        `computerAsk` = try object.optional("computerAsk")
        `accessRequest` = try object.optional("accessRequest")
        `outsideWrite` = try object.optional("outsideWrite")
        `lendingLift` = try object.optional("lendingLift")
        `outboundRequest` = try object.optional("outboundRequest")
        `teamMemoryRequest` = try object.optional("teamMemoryRequest")
        `title` = try object.required("title")
        `subtitle` = try object.required("subtitle")
        `summaryCode` = try object.optional("summaryCode")
        `summaryParams` = try object.optional("summaryParams")
        `options` = try object.required("options")
        `requestType` = try object.optional("requestType")
        `answered` = try object.optional("answered")
        `answeredText` = try object.optional("answeredText")
        `dismissed` = try object.optional("dismissed")
        `answeredBy` = try object.optional("answeredBy")
        `requestId` = try object.optional("requestId")
        `tool` = try object.optional("tool")
        `held` = try object.optional("held")
        `expired` = try object.optional("expired")
        `stopped` = try object.optional("stopped")
        `heldCode` = try object.optional("heldCode")
        `allowKey` = try object.optional("allowKey")
        `allowSession` = try object.optional("allowSession")
        `commandAllowlist` = try object.optional("commandAllowlist")
        `approvalScope` = try object.optional("approvalScope")
        `autoApplied` = try object.optional("autoApplied")
        `undone` = try object.optional("undone")
        `routineRequest` = try object.optional("routineRequest")
        `webhookRequest` = try object.optional("webhookRequest")
        `appTriggerRequest` = try object.optional("appTriggerRequest")
        `profileRequest` = try object.optional("profileRequest")
        `modelRequest` = try object.optional("modelRequest")
        `teamSetupRequest` = try object.optional("teamSetupRequest")
        `mcpRequest` = try object.optional("mcpRequest")
        `skillRequest` = try object.optional("skillRequest")
        `questionRequest` = try object.optional("questionRequest")
        `fixedOptions` = try object.optional("fixedOptions")
        `quotaSwitch` = try object.optional("quotaSwitch")
        `yourComputer` = try object.optional("yourComputer")
        additionalFields = object.remainder(excluding: ["waitRequest", "computerAsk", "accessRequest", "outsideWrite", "lendingLift", "outboundRequest", "teamMemoryRequest", "title", "subtitle", "summaryCode", "summaryParams", "options", "requestType", "answered", "answeredText", "dismissed", "answeredBy", "requestId", "tool", "held", "expired", "stopped", "heldCode", "allowKey", "allowSession", "commandAllowlist", "approvalScope", "autoApplied", "undone", "routineRequest", "webhookRequest", "appTriggerRequest", "profileRequest", "modelRequest", "teamSetupRequest", "mcpRequest", "skillRequest", "questionRequest", "fixedOptions", "quotaSwitch", "yourComputer"])
        explicitNulls = object.nullKeys.intersection(["waitRequest", "computerAsk", "accessRequest", "outsideWrite", "lendingLift", "outboundRequest", "teamMemoryRequest", "title", "subtitle", "summaryCode", "summaryParams", "options", "requestType", "answered", "answeredText", "dismissed", "answeredBy", "requestId", "tool", "held", "expired", "stopped", "heldCode", "allowKey", "allowSession", "commandAllowlist", "approvalScope", "autoApplied", "undone", "routineRequest", "webhookRequest", "appTriggerRequest", "profileRequest", "modelRequest", "teamSetupRequest", "mcpRequest", "skillRequest", "questionRequest", "fixedOptions", "quotaSwitch", "yourComputer"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("waitRequest", `waitRequest`, nulls: explicitNulls)
        try object.putOptional("computerAsk", `computerAsk`, nulls: explicitNulls)
        try object.putOptional("accessRequest", `accessRequest`, nulls: explicitNulls)
        try object.putOptional("outsideWrite", `outsideWrite`, nulls: explicitNulls)
        try object.putOptional("lendingLift", `lendingLift`, nulls: explicitNulls)
        try object.putOptional("outboundRequest", `outboundRequest`, nulls: explicitNulls)
        try object.putOptional("teamMemoryRequest", `teamMemoryRequest`, nulls: explicitNulls)
        try object.put("title", `title`)
        try object.put("subtitle", `subtitle`)
        try object.putOptional("summaryCode", `summaryCode`, nulls: explicitNulls)
        try object.putOptional("summaryParams", `summaryParams`, nulls: explicitNulls)
        try object.put("options", `options`)
        try object.putOptional("requestType", `requestType`, nulls: explicitNulls)
        try object.putOptional("answered", `answered`, nulls: explicitNulls)
        try object.putOptional("answeredText", `answeredText`, nulls: explicitNulls)
        try object.putOptional("dismissed", `dismissed`, nulls: explicitNulls)
        try object.putOptional("answeredBy", `answeredBy`, nulls: explicitNulls)
        try object.putOptional("requestId", `requestId`, nulls: explicitNulls)
        try object.putOptional("tool", `tool`, nulls: explicitNulls)
        try object.putOptional("held", `held`, nulls: explicitNulls)
        try object.putOptional("expired", `expired`, nulls: explicitNulls)
        try object.putOptional("stopped", `stopped`, nulls: explicitNulls)
        try object.putOptional("heldCode", `heldCode`, nulls: explicitNulls)
        try object.putOptional("allowKey", `allowKey`, nulls: explicitNulls)
        try object.putOptional("allowSession", `allowSession`, nulls: explicitNulls)
        try object.putOptional("commandAllowlist", `commandAllowlist`, nulls: explicitNulls)
        try object.putOptional("approvalScope", `approvalScope`, nulls: explicitNulls)
        try object.putOptional("autoApplied", `autoApplied`, nulls: explicitNulls)
        try object.putOptional("undone", `undone`, nulls: explicitNulls)
        try object.putOptional("routineRequest", `routineRequest`, nulls: explicitNulls)
        try object.putOptional("webhookRequest", `webhookRequest`, nulls: explicitNulls)
        try object.putOptional("appTriggerRequest", `appTriggerRequest`, nulls: explicitNulls)
        try object.putOptional("profileRequest", `profileRequest`, nulls: explicitNulls)
        try object.putOptional("modelRequest", `modelRequest`, nulls: explicitNulls)
        try object.putOptional("teamSetupRequest", `teamSetupRequest`, nulls: explicitNulls)
        try object.putOptional("mcpRequest", `mcpRequest`, nulls: explicitNulls)
        try object.putOptional("skillRequest", `skillRequest`, nulls: explicitNulls)
        try object.putOptional("questionRequest", `questionRequest`, nulls: explicitNulls)
        try object.putOptional("fixedOptions", `fixedOptions`, nulls: explicitNulls)
        try object.putOptional("quotaSwitch", `quotaSwitch`, nulls: explicitNulls)
        try object.putOptional("yourComputer", `yourComputer`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct OptionCardDataAccessRequest: WireModel {
    public var `botId`: String
    public var `botName`: String
    public var `email`: String
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `botName`: String, `email`: String, `name`: String) {
        self.`botId` = `botId`
        self.`botName` = `botName`
        self.`email` = `email`
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `botName` = try object.required("botName")
        `email` = try object.required("email")
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["botId", "botName", "email", "name"])
        explicitNulls = object.nullKeys.intersection(["botId", "botName", "email", "name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("botName", `botName`)
        try object.put("email", `email`)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public struct OptionCardDataOutsideWriteRoomBulletin: WireModel {
    public var `roomId`: String
    public var `bulletin`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`roomId`: String, `bulletin`: String) {
        self.`roomId` = `roomId`
        self.`bulletin` = `bulletin`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `roomId` = try object.required("roomId")
        `bulletin` = try object.required("bulletin")
        additionalFields = object.remainder(excluding: ["roomId", "bulletin"])
        explicitNulls = object.nullKeys.intersection(["roomId", "bulletin"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("roomId", `roomId`)
        try object.put("bulletin", `bulletin`)
        try object.encode(to: encoder)
    }
}

public struct OptionCardDataOutsideWriteMemory: WireModel {
    public var `action`: String
    public var `text`: String?
    public var `oldText`: String?
    public var `until`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`action`: String, `text`: String? = nil, `oldText`: String? = nil, `until`: String? = nil) {
        self.`action` = `action`
        self.`text` = `text`
        self.`oldText` = `oldText`
        self.`until` = `until`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `action` = try object.required("action")
        `text` = try object.optional("text")
        `oldText` = try object.optional("oldText")
        `until` = try object.optional("until")
        additionalFields = object.remainder(excluding: ["action", "text", "oldText", "until"])
        explicitNulls = object.nullKeys.intersection(["action", "text", "oldText", "until"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("action", `action`)
        try object.putOptional("text", `text`, nulls: explicitNulls)
        try object.putOptional("oldText", `oldText`, nulls: explicitNulls)
        try object.putOptional("until", `until`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public indirect enum OptionCardDataOutsideWrite: WireModel {
    case `roomBulletin`(OptionCardDataOutsideWriteRoomBulletin)
    case `memory`(OptionCardDataOutsideWriteMemory)
    case unknown(kind: String, raw: JSONValue)

    public var kind: String {
        switch self {
        case .`roomBulletin`: return "room-bulletin"
        case .`memory`: return "memory"
        case .unknown(let kind, _): return kind
        }
    }
    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        guard let kind = raw["kind"]?.stringValue else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Missing kind"))
        }
        var payload = raw
        payload["kind"] = nil
        switch kind {
        case "room-bulletin": self = .`roomBulletin`(try payload.decode(OptionCardDataOutsideWriteRoomBulletin.self))
        case "memory": self = .`memory`(try payload.decode(OptionCardDataOutsideWriteMemory.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .`roomBulletin`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`memory`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .unknown(_, let value): try value.encode(to: encoder)
        }
    }
}

public struct OptionCardDataLendingLift: WireModel {
    public var `requestMessageId`: String
    public var `memoryToken`: String?
    public var `outside`: Bool?
    public var `botOpened`: Bool?
    public var `allowedAt`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `requestMessageId`: String,
        `memoryToken`: String? = nil,
        `outside`: Bool? = nil,
        `botOpened`: Bool? = nil,
        `allowedAt`: Double? = nil
    ) {
        self.`requestMessageId` = `requestMessageId`
        self.`memoryToken` = `memoryToken`
        self.`outside` = `outside`
        self.`botOpened` = `botOpened`
        self.`allowedAt` = `allowedAt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `requestMessageId` = try object.required("requestMessageId")
        `memoryToken` = try object.optional("memoryToken")
        `outside` = try object.optional("outside")
        `botOpened` = try object.optional("botOpened")
        `allowedAt` = try object.optional("allowedAt")
        additionalFields = object.remainder(excluding: ["requestMessageId", "memoryToken", "outside", "botOpened", "allowedAt"])
        explicitNulls = object.nullKeys.intersection(["requestMessageId", "memoryToken", "outside", "botOpened", "allowedAt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("requestMessageId", `requestMessageId`)
        try object.putOptional("memoryToken", `memoryToken`, nulls: explicitNulls)
        try object.putOptional("outside", `outside`, nulls: explicitNulls)
        try object.putOptional("botOpened", `botOpened`, nulls: explicitNulls)
        try object.putOptional("allowedAt", `allowedAt`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct OptionCardDataOutboundRequest: WireModel {
    public var `tool`: String
    public var `app`: String?
    public var `calls`: [OptionCardDataOutboundRequestCallsElement]?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`tool`: String, `app`: String?, `calls`: [OptionCardDataOutboundRequestCallsElement]? = nil) {
        self.`tool` = `tool`
        self.`app` = `app`
        self.`calls` = `calls`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `tool` = try object.required("tool")
        `app` = try object.nullable("app")
        `calls` = try object.optional("calls")
        additionalFields = object.remainder(excluding: ["tool", "app", "calls"])
        explicitNulls = object.nullKeys.intersection(["tool", "app", "calls"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("tool", `tool`)
        try object.putNullable("app", `app`)
        try object.putOptional("calls", `calls`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct OptionCardDataOutboundRequestCallsElement: WireModel {
    public var `app`: String?
    public var `label`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`app`: String?, `label`: String) {
        self.`app` = `app`
        self.`label` = `label`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `app` = try object.nullable("app")
        `label` = try object.required("label")
        additionalFields = object.remainder(excluding: ["app", "label"])
        explicitNulls = object.nullKeys.intersection(["app", "label"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putNullable("app", `app`)
        try object.put("label", `label`)
        try object.encode(to: encoder)
    }
}

public struct OptionCardDataTeamMemoryRequest: WireModel {
    public var `section`: String
    public var `entryId`: String
    public var `kind`: String
    public var `revision`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`section`: String, `entryId`: String, `kind`: String, `revision`: String? = nil) {
        self.`section` = `section`
        self.`entryId` = `entryId`
        self.`kind` = `kind`
        self.`revision` = `revision`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `section` = try object.required("section")
        `entryId` = try object.required("entryId")
        `kind` = try object.required("kind")
        `revision` = try object.optional("revision")
        additionalFields = object.remainder(excluding: ["section", "entryId", "kind", "revision"])
        explicitNulls = object.nullKeys.intersection(["section", "entryId", "kind", "revision"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("section", `section`)
        try object.put("entryId", `entryId`)
        try object.put("kind", `kind`)
        try object.putOptional("revision", `revision`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum OptionCardDataRequestType: WireModel, Hashable, Sendable {
    case `permission`
    case `question`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "permission": self = .`permission`
        case "question": self = .`question`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`permission`: return "permission"
        case .`question`: return "question"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct CardAnswererSession: WireModel {
    public var `name`: String
    public var `person`: String?
    public var `via`: CardAnswererSessionVia?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `person`: String? = nil, `via`: CardAnswererSessionVia? = nil) {
        self.`name` = `name`
        self.`person` = `person`
        self.`via` = `via`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `person` = try object.optional("person")
        `via` = try object.optional("via")
        additionalFields = object.remainder(excluding: ["name", "person", "via"])
        explicitNulls = object.nullKeys.intersection(["name", "person", "via"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("person", `person`, nulls: explicitNulls)
        try object.putOptional("via", `via`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum CardAnswererSessionVia: WireModel, Hashable, Sendable {
    case `call`
    case `reaction`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "call": self = .`call`
        case "reaction": self = .`reaction`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`call`: return "call"
        case .`reaction`: return "reaction"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct CardAnswererLoopback: WireModel {
    public var `via`: CardAnswererLoopbackVia?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`via`: CardAnswererLoopbackVia? = nil) {
        self.`via` = `via`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `via` = try object.optional("via")
        additionalFields = object.remainder(excluding: ["via"])
        explicitNulls = object.nullKeys.intersection(["via"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("via", `via`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum CardAnswererLoopbackVia: WireModel, Hashable, Sendable {
    case `call`
    case `reaction`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "call": self = .`call`
        case "reaction": self = .`reaction`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`call`: return "call"
        case .`reaction`: return "reaction"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct CardAnswererWorker: WireModel {
    public var `via`: CardAnswererWorkerVia?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`via`: CardAnswererWorkerVia? = nil) {
        self.`via` = `via`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `via` = try object.optional("via")
        additionalFields = object.remainder(excluding: ["via"])
        explicitNulls = object.nullKeys.intersection(["via"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("via", `via`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum CardAnswererWorkerVia: WireModel, Hashable, Sendable {
    case `call`
    case `reaction`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "call": self = .`call`
        case "reaction": self = .`reaction`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`call`: return "call"
        case .`reaction`: return "reaction"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct CardAnswererBot: WireModel {
    public var `name`: String
    public var `via`: CardAnswererBotVia?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `via`: CardAnswererBotVia? = nil) {
        self.`name` = `name`
        self.`via` = `via`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `via` = try object.optional("via")
        additionalFields = object.remainder(excluding: ["name", "via"])
        explicitNulls = object.nullKeys.intersection(["name", "via"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("via", `via`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum CardAnswererBotVia: WireModel, Hashable, Sendable {
    case `call`
    case `reaction`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "call": self = .`call`
        case "reaction": self = .`reaction`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`call`: return "call"
        case .`reaction`: return "reaction"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public indirect enum CardAnswerer: WireModel {
    case `session`(CardAnswererSession)
    case `loopback`(CardAnswererLoopback)
    case `worker`(CardAnswererWorker)
    case `bot`(CardAnswererBot)
    case unknown(kind: String, raw: JSONValue)

    public var kind: String {
        switch self {
        case .`session`: return "session"
        case .`loopback`: return "loopback"
        case .`worker`: return "worker"
        case .`bot`: return "bot"
        case .unknown(let kind, _): return kind
        }
    }
    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        guard let kind = raw["kind"]?.stringValue else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Missing kind"))
        }
        var payload = raw
        payload["kind"] = nil
        switch kind {
        case "session": self = .`session`(try payload.decode(CardAnswererSession.self))
        case "loopback": self = .`loopback`(try payload.decode(CardAnswererLoopback.self))
        case "worker": self = .`worker`(try payload.decode(CardAnswererWorker.self))
        case "bot": self = .`bot`(try payload.decode(CardAnswererBot.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .`session`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`loopback`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`worker`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`bot`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .unknown(_, let value): try value.encode(to: encoder)
        }
    }
}

public struct ModelSelection: WireModel {
    public var `instanceId`: String
    public var `model`: String
    public var `effort`: EffortLevel?
    public var `variant`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`instanceId`: String, `model`: String, `effort`: EffortLevel? = nil, `variant`: String? = nil) {
        self.`instanceId` = `instanceId`
        self.`model` = `model`
        self.`effort` = `effort`
        self.`variant` = `variant`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `instanceId` = try object.required("instanceId")
        `model` = try object.required("model")
        `effort` = try object.optional("effort")
        `variant` = try object.optional("variant")
        additionalFields = object.remainder(excluding: ["instanceId", "model", "effort", "variant"])
        explicitNulls = object.nullKeys.intersection(["instanceId", "model", "effort", "variant"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("instanceId", `instanceId`)
        try object.put("model", `model`)
        try object.putOptional("effort", `effort`, nulls: explicitNulls)
        try object.putOptional("variant", `variant`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct QuotaSwitchCardData: WireModel {
    public var `engines`: [QuotaSwitchCardDataEnginesElement]
    public var `messageId`: String?
    public var `rootId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`engines`: [QuotaSwitchCardDataEnginesElement], `messageId`: String? = nil, `rootId`: String? = nil) {
        self.`engines` = `engines`
        self.`messageId` = `messageId`
        self.`rootId` = `rootId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `engines` = try object.required("engines")
        `messageId` = try object.optional("messageId")
        `rootId` = try object.optional("rootId")
        additionalFields = object.remainder(excluding: ["engines", "messageId", "rootId"])
        explicitNulls = object.nullKeys.intersection(["engines", "messageId", "rootId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("engines", `engines`)
        try object.putOptional("messageId", `messageId`, nulls: explicitNulls)
        try object.putOptional("rootId", `rootId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct QuotaSwitchCardDataEnginesElement: WireModel {
    public var `instanceId`: String
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`instanceId`: String, `name`: String) {
        self.`instanceId` = `instanceId`
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `instanceId` = try object.required("instanceId")
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["instanceId", "name"])
        explicitNulls = object.nullKeys.intersection(["instanceId", "name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("instanceId", `instanceId`)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public struct OptionCardDataYourComputer: WireModel {
    public var `app`: String?
    public var `site`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`app`: String? = nil, `site`: String? = nil) {
        self.`app` = `app`
        self.`site` = `site`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `app` = try object.optional("app")
        `site` = try object.optional("site")
        additionalFields = object.remainder(excluding: ["app", "site"])
        explicitNulls = object.nullKeys.intersection(["app", "site"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("app", `app`, nulls: explicitNulls)
        try object.putOptional("site", `site`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WireMessageFieldsSetupSuggestion: WireModel {
    public var `kind`: String
    public var `answer`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`kind`: String, `answer`: String? = nil) {
        self.`kind` = `kind`
        self.`answer` = `answer`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `kind` = try object.required("kind")
        `answer` = try object.optional("answer")
        additionalFields = object.remainder(excluding: ["kind", "answer"])
        explicitNulls = object.nullKeys.intersection(["kind", "answer"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("kind", `kind`)
        try object.putOptional("answer", `answer`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct SecretRequestCardData: WireModel {
    public var `target`: SecretRequestCardDataTarget
    public var `label`: String
    public var `description`: String
    public var `descriptionParts`: SecretRequestCardDataDescriptionParts?
    public var `placeholder`: String
    public var `helpUrl`: String
    public var `delivery`: SecretRequestCardDataDelivery?
    public var `address`: String?
    public var `emailReading`: String?
    public var `emailOutgoing`: EmailOutgoingFields?
    public var `reason`: String?
    public var `vm`: String?
    public var `savedAt`: Double?
    public var `requestKey`: String
    public var `phoneOperationId`: String?
    public var `provided`: Bool?
    public var `dismissed`: Bool?
    public var `superseded`: Bool?
    public var `resumed`: Bool?
    public var `error`: String?
    public var `stopped`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `target`: SecretRequestCardDataTarget,
        `label`: String,
        `description`: String,
        `placeholder`: String,
        `helpUrl`: String,
        `requestKey`: String,
        `descriptionParts`: SecretRequestCardDataDescriptionParts? = nil,
        `delivery`: SecretRequestCardDataDelivery? = nil,
        `address`: String? = nil,
        `emailReading`: String? = nil,
        `emailOutgoing`: EmailOutgoingFields? = nil,
        `reason`: String? = nil,
        `vm`: String? = nil,
        `savedAt`: Double? = nil,
        `phoneOperationId`: String? = nil,
        `provided`: Bool? = nil,
        `dismissed`: Bool? = nil,
        `superseded`: Bool? = nil,
        `resumed`: Bool? = nil,
        `error`: String? = nil,
        `stopped`: Bool? = nil
    ) {
        self.`target` = `target`
        self.`label` = `label`
        self.`description` = `description`
        self.`descriptionParts` = `descriptionParts`
        self.`placeholder` = `placeholder`
        self.`helpUrl` = `helpUrl`
        self.`delivery` = `delivery`
        self.`address` = `address`
        self.`emailReading` = `emailReading`
        self.`emailOutgoing` = `emailOutgoing`
        self.`reason` = `reason`
        self.`vm` = `vm`
        self.`savedAt` = `savedAt`
        self.`requestKey` = `requestKey`
        self.`phoneOperationId` = `phoneOperationId`
        self.`provided` = `provided`
        self.`dismissed` = `dismissed`
        self.`superseded` = `superseded`
        self.`resumed` = `resumed`
        self.`error` = `error`
        self.`stopped` = `stopped`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `target` = try object.required("target")
        `label` = try object.required("label")
        `description` = try object.required("description")
        `descriptionParts` = try object.optional("descriptionParts")
        `placeholder` = try object.required("placeholder")
        `helpUrl` = try object.required("helpUrl")
        `delivery` = try object.optional("delivery")
        `address` = try object.optional("address")
        `emailReading` = try object.optional("emailReading")
        `emailOutgoing` = try object.optional("emailOutgoing")
        `reason` = try object.optional("reason")
        `vm` = try object.optional("vm")
        `savedAt` = try object.optional("savedAt")
        `requestKey` = try object.required("requestKey")
        `phoneOperationId` = try object.optional("phoneOperationId")
        `provided` = try object.optional("provided")
        `dismissed` = try object.optional("dismissed")
        `superseded` = try object.optional("superseded")
        `resumed` = try object.optional("resumed")
        `error` = try object.optional("error")
        `stopped` = try object.optional("stopped")
        additionalFields = object.remainder(excluding: ["target", "label", "description", "descriptionParts", "placeholder", "helpUrl", "delivery", "address", "emailReading", "emailOutgoing", "reason", "vm", "savedAt", "requestKey", "phoneOperationId", "provided", "dismissed", "superseded", "resumed", "error", "stopped"])
        explicitNulls = object.nullKeys.intersection(["target", "label", "description", "descriptionParts", "placeholder", "helpUrl", "delivery", "address", "emailReading", "emailOutgoing", "reason", "vm", "savedAt", "requestKey", "phoneOperationId", "provided", "dismissed", "superseded", "resumed", "error", "stopped"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("target", `target`)
        try object.put("label", `label`)
        try object.put("description", `description`)
        try object.putOptional("descriptionParts", `descriptionParts`, nulls: explicitNulls)
        try object.put("placeholder", `placeholder`)
        try object.put("helpUrl", `helpUrl`)
        try object.putOptional("delivery", `delivery`, nulls: explicitNulls)
        try object.putOptional("address", `address`, nulls: explicitNulls)
        try object.putOptional("emailReading", `emailReading`, nulls: explicitNulls)
        try object.putOptional("emailOutgoing", `emailOutgoing`, nulls: explicitNulls)
        try object.putOptional("reason", `reason`, nulls: explicitNulls)
        try object.putOptional("vm", `vm`, nulls: explicitNulls)
        try object.putOptional("savedAt", `savedAt`, nulls: explicitNulls)
        try object.put("requestKey", `requestKey`)
        try object.putOptional("phoneOperationId", `phoneOperationId`, nulls: explicitNulls)
        try object.putOptional("provided", `provided`, nulls: explicitNulls)
        try object.putOptional("dismissed", `dismissed`, nulls: explicitNulls)
        try object.putOptional("superseded", `superseded`, nulls: explicitNulls)
        try object.putOptional("resumed", `resumed`, nulls: explicitNulls)
        try object.putOptional("error", `error`, nulls: explicitNulls)
        try object.putOptional("stopped", `stopped`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public indirect enum SecretRequestCardDataTarget: WireModel {
    case object(CredentialTargetId)
    case json(JSONValue)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if let value = try? raw.decode(CredentialTargetId.self) { self = .object(value); return }
        if let value = try? raw.decode(JSONValue.self) { self = .json(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .object(let value): try value.encode(to: encoder)
        case .json(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public struct SecretRequestCardDataDescriptionParts: WireModel {
    public var `baseCode`: SecretRequestCardDataDescriptionPartsBaseCode
    public var `reason`: String
    public var `bot`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`baseCode`: SecretRequestCardDataDescriptionPartsBaseCode, `reason`: String, `bot`: String) {
        self.`baseCode` = `baseCode`
        self.`reason` = `reason`
        self.`bot` = `bot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `baseCode` = try object.required("baseCode")
        `reason` = try object.required("reason")
        `bot` = try object.required("bot")
        additionalFields = object.remainder(excluding: ["baseCode", "reason", "bot"])
        explicitNulls = object.nullKeys.intersection(["baseCode", "reason", "bot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("baseCode", `baseCode`)
        try object.put("reason", `reason`)
        try object.put("bot", `bot`)
        try object.encode(to: encoder)
    }
}

public enum SecretRequestCardDataDescriptionPartsBaseCode: WireModel, Hashable, Sendable {
    case `secretCardGreenferenceDescription`
    case `secretCardModelgoDescription`
    case `secretCardGeminiTtsDescription`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "secretCard.greenference.description": self = .`secretCardGreenferenceDescription`
        case "secretCard.modelgo.description": self = .`secretCardModelgoDescription`
        case "secretCard.geminiTts.description": self = .`secretCardGeminiTtsDescription`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`secretCardGreenferenceDescription`: return "secretCard.greenference.description"
        case .`secretCardModelgoDescription`: return "secretCard.modelgo.description"
        case .`secretCardGeminiTtsDescription`: return "secretCard.geminiTts.description"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum SecretRequestCardDataDelivery: WireModel, Hashable, Sendable {
    case `ref`
    case `file`
    case `email`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "ref": self = .`ref`
        case "file": self = .`file`
        case "email": self = .`email`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`ref`: return "ref"
        case .`file`: return "file"
        case .`email`: return "email"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct SignInRequestCardData: WireModel {
    public var `url`: String
    public var `site`: String
    public var `reason`: String?
    public var `place`: Surface
    public var `done`: Bool?
    public var `cancelled`: Bool?
    public var `superseded`: Bool?
    public var `savedLogin`: String?
    public var `resumed`: Bool?
    public var `error`: String?
    public var `stopped`: Bool?
    public var `answeredInChat`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `url`: String,
        `site`: String,
        `place`: Surface,
        `reason`: String? = nil,
        `done`: Bool? = nil,
        `cancelled`: Bool? = nil,
        `superseded`: Bool? = nil,
        `savedLogin`: String? = nil,
        `resumed`: Bool? = nil,
        `error`: String? = nil,
        `stopped`: Bool? = nil,
        `answeredInChat`: Bool? = nil
    ) {
        self.`url` = `url`
        self.`site` = `site`
        self.`reason` = `reason`
        self.`place` = `place`
        self.`done` = `done`
        self.`cancelled` = `cancelled`
        self.`superseded` = `superseded`
        self.`savedLogin` = `savedLogin`
        self.`resumed` = `resumed`
        self.`error` = `error`
        self.`stopped` = `stopped`
        self.`answeredInChat` = `answeredInChat`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `url` = try object.required("url")
        `site` = try object.required("site")
        `reason` = try object.optional("reason")
        `place` = try object.required("place")
        `done` = try object.optional("done")
        `cancelled` = try object.optional("cancelled")
        `superseded` = try object.optional("superseded")
        `savedLogin` = try object.optional("savedLogin")
        `resumed` = try object.optional("resumed")
        `error` = try object.optional("error")
        `stopped` = try object.optional("stopped")
        `answeredInChat` = try object.optional("answeredInChat")
        additionalFields = object.remainder(excluding: ["url", "site", "reason", "place", "done", "cancelled", "superseded", "savedLogin", "resumed", "error", "stopped", "answeredInChat"])
        explicitNulls = object.nullKeys.intersection(["url", "site", "reason", "place", "done", "cancelled", "superseded", "savedLogin", "resumed", "error", "stopped", "answeredInChat"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("url", `url`)
        try object.put("site", `site`)
        try object.putOptional("reason", `reason`, nulls: explicitNulls)
        try object.put("place", `place`)
        try object.putOptional("done", `done`, nulls: explicitNulls)
        try object.putOptional("cancelled", `cancelled`, nulls: explicitNulls)
        try object.putOptional("superseded", `superseded`, nulls: explicitNulls)
        try object.putOptional("savedLogin", `savedLogin`, nulls: explicitNulls)
        try object.putOptional("resumed", `resumed`, nulls: explicitNulls)
        try object.putOptional("error", `error`, nulls: explicitNulls)
        try object.putOptional("stopped", `stopped`, nulls: explicitNulls)
        try object.putOptional("answeredInChat", `answeredInChat`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum Surface: WireModel, Hashable, Sendable {
    case `cloud`
    case `vm`
    case `local`
    case `browser`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "cloud": self = .`cloud`
        case "vm": self = .`vm`
        case "local": self = .`local`
        case "browser": self = .`browser`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`cloud`: return "cloud"
        case .`vm`: return "vm"
        case .`local`: return "local"
        case .`browser`: return "browser"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct WireMessageFieldsTool: WireModel {
    public var `nameCode`: String?
    public var `nameParams`: ServerTextParams?
    public var `summaryCode`: String?
    public var `summaryParams`: ServerTextParams?
    public var `name`: String
    public var `ok`: Bool?
    public var `spoken`: String?
    public var `setup`: Bool?
    public var `terminal`: Bool?
    public var `summary`: String?
    public var `input`: String?
    public var `output`: String?
    public var `step`: LiveStep?
    public var `whose`: WireMessageFieldsToolWhose?
    public var `claudeUpdate`: Bool?
    public var `rescue`: FirstReplyRescue?
    public var `place`: PlaceRow?
    public var `limitResetsAt`: Double?
    public var `problem`: String?
    public var `itemId`: String?
    public var `fullResult`: Bool?
    public var `clipped`: Bool?
    public var `label`: String?
    public var `partial`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String,
        `nameCode`: String? = nil,
        `nameParams`: ServerTextParams? = nil,
        `summaryCode`: String? = nil,
        `summaryParams`: ServerTextParams? = nil,
        `ok`: Bool? = nil,
        `spoken`: String? = nil,
        `setup`: Bool? = nil,
        `terminal`: Bool? = nil,
        `summary`: String? = nil,
        `input`: String? = nil,
        `output`: String? = nil,
        `step`: LiveStep? = nil,
        `whose`: WireMessageFieldsToolWhose? = nil,
        `claudeUpdate`: Bool? = nil,
        `rescue`: FirstReplyRescue? = nil,
        `place`: PlaceRow? = nil,
        `limitResetsAt`: Double? = nil,
        `problem`: String? = nil,
        `itemId`: String? = nil,
        `fullResult`: Bool? = nil,
        `clipped`: Bool? = nil,
        `label`: String? = nil,
        `partial`: Bool? = nil
    ) {
        self.`nameCode` = `nameCode`
        self.`nameParams` = `nameParams`
        self.`summaryCode` = `summaryCode`
        self.`summaryParams` = `summaryParams`
        self.`name` = `name`
        self.`ok` = `ok`
        self.`spoken` = `spoken`
        self.`setup` = `setup`
        self.`terminal` = `terminal`
        self.`summary` = `summary`
        self.`input` = `input`
        self.`output` = `output`
        self.`step` = `step`
        self.`whose` = `whose`
        self.`claudeUpdate` = `claudeUpdate`
        self.`rescue` = `rescue`
        self.`place` = `place`
        self.`limitResetsAt` = `limitResetsAt`
        self.`problem` = `problem`
        self.`itemId` = `itemId`
        self.`fullResult` = `fullResult`
        self.`clipped` = `clipped`
        self.`label` = `label`
        self.`partial` = `partial`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `nameCode` = try object.optional("nameCode")
        `nameParams` = try object.optional("nameParams")
        `summaryCode` = try object.optional("summaryCode")
        `summaryParams` = try object.optional("summaryParams")
        `name` = try object.required("name")
        `ok` = try object.optional("ok")
        `spoken` = try object.optional("spoken")
        `setup` = try object.optional("setup")
        `terminal` = try object.optional("terminal")
        `summary` = try object.optional("summary")
        `input` = try object.optional("input")
        `output` = try object.optional("output")
        `step` = try object.optional("step")
        `whose` = try object.optional("whose")
        `claudeUpdate` = try object.optional("claudeUpdate")
        `rescue` = try object.optional("rescue")
        `place` = try object.optional("place")
        `limitResetsAt` = try object.optional("limitResetsAt")
        `problem` = try object.optional("problem")
        `itemId` = try object.optional("itemId")
        `fullResult` = try object.optional("fullResult")
        `clipped` = try object.optional("clipped")
        `label` = try object.optional("label")
        `partial` = try object.optional("partial")
        additionalFields = object.remainder(excluding: ["nameCode", "nameParams", "summaryCode", "summaryParams", "name", "ok", "spoken", "setup", "terminal", "summary", "input", "output", "step", "whose", "claudeUpdate", "rescue", "place", "limitResetsAt", "problem", "itemId", "fullResult", "clipped", "label", "partial"])
        explicitNulls = object.nullKeys.intersection(["nameCode", "nameParams", "summaryCode", "summaryParams", "name", "ok", "spoken", "setup", "terminal", "summary", "input", "output", "step", "whose", "claudeUpdate", "rescue", "place", "limitResetsAt", "problem", "itemId", "fullResult", "clipped", "label", "partial"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("nameCode", `nameCode`, nulls: explicitNulls)
        try object.putOptional("nameParams", `nameParams`, nulls: explicitNulls)
        try object.putOptional("summaryCode", `summaryCode`, nulls: explicitNulls)
        try object.putOptional("summaryParams", `summaryParams`, nulls: explicitNulls)
        try object.put("name", `name`)
        try object.putOptional("ok", `ok`, nulls: explicitNulls)
        try object.putOptional("spoken", `spoken`, nulls: explicitNulls)
        try object.putOptional("setup", `setup`, nulls: explicitNulls)
        try object.putOptional("terminal", `terminal`, nulls: explicitNulls)
        try object.putOptional("summary", `summary`, nulls: explicitNulls)
        try object.putOptional("input", `input`, nulls: explicitNulls)
        try object.putOptional("output", `output`, nulls: explicitNulls)
        try object.putOptional("step", `step`, nulls: explicitNulls)
        try object.putOptional("whose", `whose`, nulls: explicitNulls)
        try object.putOptional("claudeUpdate", `claudeUpdate`, nulls: explicitNulls)
        try object.putOptional("rescue", `rescue`, nulls: explicitNulls)
        try object.putOptional("place", `place`, nulls: explicitNulls)
        try object.putOptional("limitResetsAt", `limitResetsAt`, nulls: explicitNulls)
        try object.putOptional("problem", `problem`, nulls: explicitNulls)
        try object.putOptional("itemId", `itemId`, nulls: explicitNulls)
        try object.putOptional("fullResult", `fullResult`, nulls: explicitNulls)
        try object.putOptional("clipped", `clipped`, nulls: explicitNulls)
        try object.putOptional("label", `label`, nulls: explicitNulls)
        try object.putOptional("partial", `partial`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WireMessageFieldsToolWhose: WireModel {
    public var `person`: String
    public var `app`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`person`: String, `app`: String) {
        self.`person` = `person`
        self.`app` = `app`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `person` = try object.required("person")
        `app` = try object.required("app")
        additionalFields = object.remainder(excluding: ["person", "app"])
        explicitNulls = object.nullKeys.intersection(["person", "app"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("person", `person`)
        try object.put("app", `app`)
        try object.encode(to: encoder)
    }
}

public enum WireMessageFieldsVia: WireModel, Hashable, Sendable {
    case `api`
    case `call`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "api": self = .`api`
        case "call": self = .`call`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`api`: return "api"
        case .`call`: return "call"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ResolvedSender: WireModel {
    public var `name`: String
    public var `id`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `id`: String? = nil) {
        self.`name` = `name`
        self.`id` = `id`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `id` = try object.optional("id")
        additionalFields = object.remainder(excluding: ["name", "id"])
        explicitNulls = object.nullKeys.intersection(["name", "id"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("id", `id`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum WireMessageFieldsChannelMode: WireModel, Hashable, Sendable {
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

public struct WireMessageFieldsFrom: WireModel {
    public var `botId`: String
    public var `name`: String
    public var `color`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `name`: String, `color`: String) {
        self.`botId` = `botId`
        self.`name` = `name`
        self.`color` = `color`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `name` = try object.required("name")
        `color` = try object.required("color")
        additionalFields = object.remainder(excluding: ["botId", "name", "color"])
        explicitNulls = object.nullKeys.intersection(["botId", "name", "color"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("name", `name`)
        try object.put("color", `color`)
        try object.encode(to: encoder)
    }
}

public struct WireMessageFieldsThreadPost: WireModel {
    public var `deliveryId`: String
    public var `fromBotId`: String
    public var `fromThreadId`: String
    public var `seen`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`deliveryId`: String, `fromBotId`: String, `fromThreadId`: String, `seen`: Bool? = nil) {
        self.`deliveryId` = `deliveryId`
        self.`fromBotId` = `fromBotId`
        self.`fromThreadId` = `fromThreadId`
        self.`seen` = `seen`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `deliveryId` = try object.required("deliveryId")
        `fromBotId` = try object.required("fromBotId")
        `fromThreadId` = try object.required("fromThreadId")
        `seen` = try object.optional("seen")
        additionalFields = object.remainder(excluding: ["deliveryId", "fromBotId", "fromThreadId", "seen"])
        explicitNulls = object.nullKeys.intersection(["deliveryId", "fromBotId", "fromThreadId", "seen"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("deliveryId", `deliveryId`)
        try object.put("fromBotId", `fromBotId`)
        try object.put("fromThreadId", `fromThreadId`)
        try object.putOptional("seen", `seen`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WireMessageFieldsPeerPost: WireModel {
    public var `unattended`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`unattended`: Bool? = nil) {
        self.`unattended` = `unattended`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `unattended` = try object.optional("unattended")
        additionalFields = object.remainder(excluding: ["unattended"])
        explicitNulls = object.nullKeys.intersection(["unattended"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("unattended", `unattended`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WireMessageFieldsRoutedBy: WireModel {
    public var `provider`: WireMessageFieldsRoutedByProvider
    public var `probability`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`provider`: WireMessageFieldsRoutedByProvider, `probability`: Double) {
        self.`provider` = `provider`
        self.`probability` = `probability`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `provider` = try object.required("provider")
        `probability` = try object.required("probability")
        additionalFields = object.remainder(excluding: ["provider", "probability"])
        explicitNulls = object.nullKeys.intersection(["provider", "probability"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("provider", `provider`)
        try object.put("probability", `probability`)
        try object.encode(to: encoder)
    }
}

public enum WireMessageFieldsRoutedByProvider: WireModel, Hashable, Sendable {
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

public struct WireMessageFieldsPeerAsk: WireModel {
    public var `botId`: String
    public var `name`: String
    public var `unattended`: Bool?
    public var `incident`: WireMessageFieldsPeerAskIncident?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `name`: String, `unattended`: Bool? = nil, `incident`: WireMessageFieldsPeerAskIncident? = nil) {
        self.`botId` = `botId`
        self.`name` = `name`
        self.`unattended` = `unattended`
        self.`incident` = `incident`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `name` = try object.required("name")
        `unattended` = try object.optional("unattended")
        `incident` = try object.optional("incident")
        additionalFields = object.remainder(excluding: ["botId", "name", "unattended", "incident"])
        explicitNulls = object.nullKeys.intersection(["botId", "name", "unattended", "incident"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("name", `name`)
        try object.putOptional("unattended", `unattended`, nulls: explicitNulls)
        try object.putOptional("incident", `incident`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WireMessageFieldsPeerAskIncident: WireModel {
    public var `threadId`: String
    public var `notified`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`threadId`: String, `notified`: Bool? = nil) {
        self.`threadId` = `threadId`
        self.`notified` = `notified`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `threadId` = try object.required("threadId")
        `notified` = try object.optional("notified")
        additionalFields = object.remainder(excluding: ["threadId", "notified"])
        explicitNulls = object.nullKeys.intersection(["threadId", "notified"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("threadId", `threadId`)
        try object.putOptional("notified", `notified`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WireMessageFieldsReactionsElement: WireModel {
    public var `emoji`: String
    public var `by`: String
    public var `name`: String?
    public var `at`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`emoji`: String, `by`: String, `name`: String? = nil, `at`: Double? = nil) {
        self.`emoji` = `emoji`
        self.`by` = `by`
        self.`name` = `name`
        self.`at` = `at`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `emoji` = try object.required("emoji")
        `by` = try object.required("by")
        `name` = try object.optional("name")
        `at` = try object.optional("at")
        additionalFields = object.remainder(excluding: ["emoji", "by", "name", "at"])
        explicitNulls = object.nullKeys.intersection(["emoji", "by", "name", "at"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("emoji", `emoji`)
        try object.put("by", `by`)
        try object.putOptional("name", `name`, nulls: explicitNulls)
        try object.putOptional("at", `at`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WireMessageFieldsComm: WireModel {
    public var `groupId`: String
    public var `threadId`: String?
    public var `withBotId`: String
    public var `withName`: String
    public var `withColor`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `groupId`: String,
        `withBotId`: String,
        `withName`: String,
        `withColor`: String,
        `threadId`: String? = nil
    ) {
        self.`groupId` = `groupId`
        self.`threadId` = `threadId`
        self.`withBotId` = `withBotId`
        self.`withName` = `withName`
        self.`withColor` = `withColor`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `groupId` = try object.required("groupId")
        `threadId` = try object.optional("threadId")
        `withBotId` = try object.required("withBotId")
        `withName` = try object.required("withName")
        `withColor` = try object.required("withColor")
        additionalFields = object.remainder(excluding: ["groupId", "threadId", "withBotId", "withName", "withColor"])
        explicitNulls = object.nullKeys.intersection(["groupId", "threadId", "withBotId", "withName", "withColor"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("groupId", `groupId`)
        try object.putOptional("threadId", `threadId`, nulls: explicitNulls)
        try object.put("withBotId", `withBotId`)
        try object.put("withName", `withName`)
        try object.put("withColor", `withColor`)
        try object.encode(to: encoder)
    }
}

public struct WireMessageFieldsRelay: WireModel {
    public var `kind`: WireMessageFieldsRelayKind
    public var `email`: String
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`kind`: WireMessageFieldsRelayKind, `email`: String, `name`: String) {
        self.`kind` = `kind`
        self.`email` = `email`
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `kind` = try object.required("kind")
        `email` = try object.required("email")
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["kind", "email", "name"])
        explicitNulls = object.nullKeys.intersection(["kind", "email", "name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("kind", `kind`)
        try object.put("email", `email`)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public enum WireMessageFieldsRelayKind: WireModel, Hashable, Sendable {
    case `told`
    case `reply`
    case `assistant`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "told": self = .`told`
        case "reply": self = .`reply`
        case "assistant": self = .`assistant`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`told`: return "told"
        case .`reply`: return "reply"
        case .`assistant`: return "assistant"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct WireMessageFieldsThreadRef: WireModel {
    public var `botId`: String
    public var `threadId`: String
    public var `title`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `threadId`: String, `title`: String) {
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`title` = `title`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `title` = try object.required("title")
        additionalFields = object.remainder(excluding: ["botId", "threadId", "title"])
        explicitNulls = object.nullKeys.intersection(["botId", "threadId", "title"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("title", `title`)
        try object.encode(to: encoder)
    }
}

public struct WireMessageFieldsSentDirectly: WireModel {
    public var `name`: String
    public var `room`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `room`: String? = nil) {
        self.`name` = `name`
        self.`room` = `room`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `room` = try object.optional("room")
        additionalFields = object.remainder(excluding: ["name", "room"])
        explicitNulls = object.nullKeys.intersection(["name", "room"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("room", `room`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WireMessageFieldsDataResult: WireModel {
    public var `botId`: String
    public var `cardId`: String
    public var `title`: String
    public var `kind`: WireMessageFieldsDataResultKind
    public var `sql`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `botId`: String,
        `cardId`: String,
        `title`: String,
        `kind`: WireMessageFieldsDataResultKind,
        `sql`: String? = nil
    ) {
        self.`botId` = `botId`
        self.`cardId` = `cardId`
        self.`title` = `title`
        self.`kind` = `kind`
        self.`sql` = `sql`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `cardId` = try object.required("cardId")
        `title` = try object.required("title")
        `kind` = try object.required("kind")
        `sql` = try object.optional("sql")
        additionalFields = object.remainder(excluding: ["botId", "cardId", "title", "kind", "sql"])
        explicitNulls = object.nullKeys.intersection(["botId", "cardId", "title", "kind", "sql"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("cardId", `cardId`)
        try object.put("title", `title`)
        try object.put("kind", `kind`)
        try object.putOptional("sql", `sql`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum WireMessageFieldsDataResultKind: WireModel, Hashable, Sendable {
    case `table`
    case `chart`
    case `text`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "table": self = .`table`
        case "chart": self = .`chart`
        case "text": self = .`text`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`table`: return "table"
        case .`chart`: return "chart"
        case .`text`: return "text"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct WireMessageFieldsDataContext: WireModel {
    public var `cardId`: String
    public var `draftSql`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`cardId`: String, `draftSql`: String? = nil) {
        self.`cardId` = `cardId`
        self.`draftSql` = `draftSql`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `cardId` = try object.required("cardId")
        `draftSql` = try object.optional("draftSql")
        additionalFields = object.remainder(excluding: ["cardId", "draftSql"])
        explicitNulls = object.nullKeys.intersection(["cardId", "draftSql"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("cardId", `cardId`)
        try object.putOptional("draftSql", `draftSql`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

@dynamicMemberLookup
public indirect enum WireMessage: WireModel {
    case `text`(WireMessageFields)
    case `options`(WireMessageFields)
    case `activity`(WireMessageFields)
    case `screen`(WireMessageFields)
    case `connector`(WireMessageFields)
    case `secret`(WireMessageFields)
    case `signin`(WireMessageFields)
    case `routineRun`(WireMessageFields)
    case `goalRun`(WireMessageFields)
    case `burst`(WireMessageFields)
    case `digest`(WireMessageFields)
    case `compaction`(WireMessageFields)
    case `call`(WireMessageFields)
    case `widget`(WireMessageFields)
    case `app`(WireMessageFields)
    case unknown(kind: String, raw: JSONValue)

    public var kind: String {
        switch self {
        case .`text`: return "text"
        case .`options`: return "options"
        case .`activity`: return "activity"
        case .`screen`: return "screen"
        case .`connector`: return "connector"
        case .`secret`: return "secret"
        case .`signin`: return "signin"
        case .`routineRun`: return "routine.run"
        case .`goalRun`: return "goal.run"
        case .`burst`: return "burst"
        case .`digest`: return "digest"
        case .`compaction`: return "compaction"
        case .`call`: return "call"
        case .`widget`: return "widget"
        case .`app`: return "app"
        case .unknown(let kind, _): return kind
        }
    }
    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        guard let kind = raw["kind"]?.stringValue else {
            self = .unknown(kind: "", raw: raw)
            return
        }
        var payload = raw
        payload["kind"] = nil
        do {
            switch kind {
            case "text": self = .`text`(try payload.decode(WireMessageFields.self))
            case "options": self = .`options`(try payload.decode(WireMessageFields.self))
            case "activity": self = .`activity`(try payload.decode(WireMessageFields.self))
            case "screen": self = .`screen`(try payload.decode(WireMessageFields.self))
            case "connector": self = .`connector`(try payload.decode(WireMessageFields.self))
            case "secret": self = .`secret`(try payload.decode(WireMessageFields.self))
            case "signin": self = .`signin`(try payload.decode(WireMessageFields.self))
            case "routine.run": self = .`routineRun`(try payload.decode(WireMessageFields.self))
            case "goal.run": self = .`goalRun`(try payload.decode(WireMessageFields.self))
            case "burst": self = .`burst`(try payload.decode(WireMessageFields.self))
            case "digest": self = .`digest`(try payload.decode(WireMessageFields.self))
            case "compaction": self = .`compaction`(try payload.decode(WireMessageFields.self))
            case "call": self = .`call`(try payload.decode(WireMessageFields.self))
            case "widget": self = .`widget`(try payload.decode(WireMessageFields.self))
            case "app": self = .`app`(try payload.decode(WireMessageFields.self))
            default: self = .unknown(kind: kind, raw: raw)
            }
        } catch {
            self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .`text`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`options`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`activity`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`screen`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`connector`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`secret`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`signin`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`routineRun`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`goalRun`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`burst`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`digest`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`compaction`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`call`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`widget`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`app`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .unknown(_, let value): try value.encode(to: encoder)
        }
    }

    public var fields: WireMessageFields? {
        switch self {
        case .`text`(let value): return value
        case .`options`(let value): return value
        case .`activity`(let value): return value
        case .`screen`(let value): return value
        case .`connector`(let value): return value
        case .`secret`(let value): return value
        case .`signin`(let value): return value
        case .`routineRun`(let value): return value
        case .`goalRun`(let value): return value
        case .`burst`(let value): return value
        case .`digest`(let value): return value
        case .`compaction`(let value): return value
        case .`call`(let value): return value
        case .`widget`(let value): return value
        case .`app`(let value): return value
        case .unknown: return nil
        }
    }
    public subscript<T>(dynamicMember keyPath: KeyPath<WireMessageFields, T>) -> T? { fields?[keyPath: keyPath] }
    public subscript<T>(dynamicMember keyPath: KeyPath<WireMessageFields, T?>) -> T? { fields?[keyPath: keyPath] }
}

public struct WireBot: WireModel {
    public var `defaultBot`: DefaultBotMark?
    public var `sidebarHidden`: Bool?
    public var `welcomed`: Bool?
    public var `access`: BotAccess?
    public var `yourAccess`: BotAccessLevel?
    public var `onlyPeopleAdded`: Bool?
    public var `waitingForTeammates`: Bool?
    public var `id`: String
    public var `threadId`: String
    public var `mainThreadId`: String?
    public var `tasks`: [WireTask]?
    public var `projects`: [BotProject]?
    public var `name`: String
    public var `title`: String
    public var `description`: String
    public var `soul`: String?
    public var `soulHash`: String?
    public var `soulDrift`: Bool?
    public var `notifications`: Bool
    public var `color`: BotColor
    public var `mascotExpression`: BotExpression?
    public var `mascotBody`: BotBodyId?
    public var `mascotFaceColor`: MascotFaceColor?
    public var `avatarUrl`: String?
    public var `avatarCrop`: BotAvatarCrop?
    public var `avatarZoom`: Double?
    public var `avatarFocusX`: Double?
    public var `avatarFocusY`: Double?
    public var `unread`: Bool
    public var `modelSelection`: ModelSelection
    public var `computer`: WireBotComputer?
    public var `cloudBackend`: CloudBackend?
    public var `autoStartVps`: Bool?
    public var `vpsAlias`: String?
    public var `cwd`: String?
    public var `autoApprove`: Bool?
    public var `approvalMode`: ApprovalMode?
    public var `alwaysAllow`: [String]?
    public var `speakReplies`: Bool?
    public var `replyStyle`: ReplyStyle?
    public var `voice`: String?
    public var `voiceNotes`: Bool?
    public var `voiceNoteEveryReply`: Bool?
    public var `xResearch`: Bool?
    public var `memoryEnabled`: Bool?
    public var `parkDirectMessages`: Bool?
    public var `rewound`: Bool?
    public var `pinned`: Bool?
    public var `hidden`: Bool?
    public var `movedTo`: BotMovedTo?
    public var `section`: String?
    public var `pinnedMessageId`: String?
    public var `chiefOfStaff`: Bool?
    public var `managedSections`: [String]?
    public var `createdBy`: String?
    public var `reportsTo`: String?
    public var `composio`: Bool?
    public var `connectorTools`: [String: ConnectorToolGrant]?
    public var `connectorScopes`: WireBotConnectorScopes?
    public var `outbound`: WireBotOutbound?
    public var `phoneApps`: PhoneApps?
    public var `fallback`: [WireBotFallbackElement]?
    public var `browser`: Bool?
    public var `recordBrowserSteps`: Bool?
    public var `memoryUpkeep`: Bool?
    public var `cacheKeepWarm`: Bool?
    public var `helperModel`: Bool?
    public var `mcpServers`: [String]?
    public var `toolScope`: ToolScope?
    public var `browserProfile`: String?
    public var `playbooks`: [InstalledPlaybook]?
    public var `installedPackage`: InstalledPackageMetadata?
    public var `busy`: Bool?
    public var `activity`: BotActivity?
    public var `createdAt`: Double
    public var `visibility`: BotVisibility?
    public var `messages`: [WireMessage]?
    public var `hasMore`: Bool?
    public var `activeLeafId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `threadId`: String,
        `name`: String,
        `title`: String,
        `description`: String,
        `notifications`: Bool,
        `color`: BotColor,
        `avatarUrl`: String?,
        `unread`: Bool,
        `modelSelection`: ModelSelection,
        `createdAt`: Double,
        `defaultBot`: DefaultBotMark? = nil,
        `sidebarHidden`: Bool? = nil,
        `welcomed`: Bool? = nil,
        `access`: BotAccess? = nil,
        `yourAccess`: BotAccessLevel? = nil,
        `onlyPeopleAdded`: Bool? = nil,
        `waitingForTeammates`: Bool? = nil,
        `mainThreadId`: String? = nil,
        `tasks`: [WireTask]? = nil,
        `projects`: [BotProject]? = nil,
        `soul`: String? = nil,
        `soulHash`: String? = nil,
        `soulDrift`: Bool? = nil,
        `mascotExpression`: BotExpression? = nil,
        `mascotBody`: BotBodyId? = nil,
        `mascotFaceColor`: MascotFaceColor? = nil,
        `avatarCrop`: BotAvatarCrop? = nil,
        `avatarZoom`: Double? = nil,
        `avatarFocusX`: Double? = nil,
        `avatarFocusY`: Double? = nil,
        `computer`: WireBotComputer? = nil,
        `cloudBackend`: CloudBackend? = nil,
        `autoStartVps`: Bool? = nil,
        `vpsAlias`: String? = nil,
        `cwd`: String? = nil,
        `autoApprove`: Bool? = nil,
        `approvalMode`: ApprovalMode? = nil,
        `alwaysAllow`: [String]? = nil,
        `speakReplies`: Bool? = nil,
        `replyStyle`: ReplyStyle? = nil,
        `voice`: String? = nil,
        `voiceNotes`: Bool? = nil,
        `voiceNoteEveryReply`: Bool? = nil,
        `xResearch`: Bool? = nil,
        `memoryEnabled`: Bool? = nil,
        `parkDirectMessages`: Bool? = nil,
        `rewound`: Bool? = nil,
        `pinned`: Bool? = nil,
        `hidden`: Bool? = nil,
        `movedTo`: BotMovedTo? = nil,
        `section`: String? = nil,
        `pinnedMessageId`: String? = nil,
        `chiefOfStaff`: Bool? = nil,
        `managedSections`: [String]? = nil,
        `createdBy`: String? = nil,
        `reportsTo`: String? = nil,
        `composio`: Bool? = nil,
        `connectorTools`: [String: ConnectorToolGrant]? = nil,
        `connectorScopes`: WireBotConnectorScopes? = nil,
        `outbound`: WireBotOutbound? = nil,
        `phoneApps`: PhoneApps? = nil,
        `fallback`: [WireBotFallbackElement]? = nil,
        `browser`: Bool? = nil,
        `recordBrowserSteps`: Bool? = nil,
        `memoryUpkeep`: Bool? = nil,
        `cacheKeepWarm`: Bool? = nil,
        `helperModel`: Bool? = nil,
        `mcpServers`: [String]? = nil,
        `toolScope`: ToolScope? = nil,
        `browserProfile`: String? = nil,
        `playbooks`: [InstalledPlaybook]? = nil,
        `installedPackage`: InstalledPackageMetadata? = nil,
        `busy`: Bool? = nil,
        `activity`: BotActivity? = nil,
        `visibility`: BotVisibility? = nil,
        `messages`: [WireMessage]? = nil,
        `hasMore`: Bool? = nil,
        `activeLeafId`: String? = nil
    ) {
        self.`defaultBot` = `defaultBot`
        self.`sidebarHidden` = `sidebarHidden`
        self.`welcomed` = `welcomed`
        self.`access` = `access`
        self.`yourAccess` = `yourAccess`
        self.`onlyPeopleAdded` = `onlyPeopleAdded`
        self.`waitingForTeammates` = `waitingForTeammates`
        self.`id` = `id`
        self.`threadId` = `threadId`
        self.`mainThreadId` = `mainThreadId`
        self.`tasks` = `tasks`
        self.`projects` = `projects`
        self.`name` = `name`
        self.`title` = `title`
        self.`description` = `description`
        self.`soul` = `soul`
        self.`soulHash` = `soulHash`
        self.`soulDrift` = `soulDrift`
        self.`notifications` = `notifications`
        self.`color` = `color`
        self.`mascotExpression` = `mascotExpression`
        self.`mascotBody` = `mascotBody`
        self.`mascotFaceColor` = `mascotFaceColor`
        self.`avatarUrl` = `avatarUrl`
        self.`avatarCrop` = `avatarCrop`
        self.`avatarZoom` = `avatarZoom`
        self.`avatarFocusX` = `avatarFocusX`
        self.`avatarFocusY` = `avatarFocusY`
        self.`unread` = `unread`
        self.`modelSelection` = `modelSelection`
        self.`computer` = `computer`
        self.`cloudBackend` = `cloudBackend`
        self.`autoStartVps` = `autoStartVps`
        self.`vpsAlias` = `vpsAlias`
        self.`cwd` = `cwd`
        self.`autoApprove` = `autoApprove`
        self.`approvalMode` = `approvalMode`
        self.`alwaysAllow` = `alwaysAllow`
        self.`speakReplies` = `speakReplies`
        self.`replyStyle` = `replyStyle`
        self.`voice` = `voice`
        self.`voiceNotes` = `voiceNotes`
        self.`voiceNoteEveryReply` = `voiceNoteEveryReply`
        self.`xResearch` = `xResearch`
        self.`memoryEnabled` = `memoryEnabled`
        self.`parkDirectMessages` = `parkDirectMessages`
        self.`rewound` = `rewound`
        self.`pinned` = `pinned`
        self.`hidden` = `hidden`
        self.`movedTo` = `movedTo`
        self.`section` = `section`
        self.`pinnedMessageId` = `pinnedMessageId`
        self.`chiefOfStaff` = `chiefOfStaff`
        self.`managedSections` = `managedSections`
        self.`createdBy` = `createdBy`
        self.`reportsTo` = `reportsTo`
        self.`composio` = `composio`
        self.`connectorTools` = `connectorTools`
        self.`connectorScopes` = `connectorScopes`
        self.`outbound` = `outbound`
        self.`phoneApps` = `phoneApps`
        self.`fallback` = `fallback`
        self.`browser` = `browser`
        self.`recordBrowserSteps` = `recordBrowserSteps`
        self.`memoryUpkeep` = `memoryUpkeep`
        self.`cacheKeepWarm` = `cacheKeepWarm`
        self.`helperModel` = `helperModel`
        self.`mcpServers` = `mcpServers`
        self.`toolScope` = `toolScope`
        self.`browserProfile` = `browserProfile`
        self.`playbooks` = `playbooks`
        self.`installedPackage` = `installedPackage`
        self.`busy` = `busy`
        self.`activity` = `activity`
        self.`createdAt` = `createdAt`
        self.`visibility` = `visibility`
        self.`messages` = `messages`
        self.`hasMore` = `hasMore`
        self.`activeLeafId` = `activeLeafId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `defaultBot` = try object.optional("defaultBot")
        `sidebarHidden` = try object.optional("sidebarHidden")
        `welcomed` = try object.optional("welcomed")
        `access` = try object.optional("access")
        `yourAccess` = try object.optional("yourAccess")
        `onlyPeopleAdded` = try object.optional("onlyPeopleAdded")
        `waitingForTeammates` = try object.optional("waitingForTeammates")
        `id` = try object.required("id")
        `threadId` = try object.required("threadId")
        `mainThreadId` = try object.optional("mainThreadId")
        `tasks` = try object.optional("tasks")
        `projects` = try object.optional("projects")
        `name` = try object.required("name")
        `title` = try object.required("title")
        `description` = try object.required("description")
        `soul` = try object.optional("soul")
        `soulHash` = try object.optional("soulHash")
        `soulDrift` = try object.optional("soulDrift")
        `notifications` = try object.required("notifications")
        `color` = try object.required("color")
        `mascotExpression` = try object.optional("mascotExpression")
        `mascotBody` = try object.optional("mascotBody")
        `mascotFaceColor` = try object.optional("mascotFaceColor")
        `avatarUrl` = try object.nullable("avatarUrl")
        `avatarCrop` = try object.optional("avatarCrop")
        `avatarZoom` = try object.optional("avatarZoom")
        `avatarFocusX` = try object.optional("avatarFocusX")
        `avatarFocusY` = try object.optional("avatarFocusY")
        `unread` = try object.required("unread")
        `modelSelection` = try object.required("modelSelection")
        `computer` = try object.optional("computer")
        `cloudBackend` = try object.optional("cloudBackend")
        `autoStartVps` = try object.optional("autoStartVps")
        `vpsAlias` = try object.optional("vpsAlias")
        `cwd` = try object.optional("cwd")
        `autoApprove` = try object.optional("autoApprove")
        `approvalMode` = try object.optional("approvalMode")
        `alwaysAllow` = try object.optional("alwaysAllow")
        `speakReplies` = try object.optional("speakReplies")
        `replyStyle` = try object.optional("replyStyle")
        `voice` = try object.optional("voice")
        `voiceNotes` = try object.optional("voiceNotes")
        `voiceNoteEveryReply` = try object.optional("voiceNoteEveryReply")
        `xResearch` = try object.optional("xResearch")
        `memoryEnabled` = try object.optional("memoryEnabled")
        `parkDirectMessages` = try object.optional("parkDirectMessages")
        `rewound` = try object.optional("rewound")
        `pinned` = try object.optional("pinned")
        `hidden` = try object.optional("hidden")
        `movedTo` = try object.optional("movedTo")
        `section` = try object.optional("section")
        `pinnedMessageId` = try object.optional("pinnedMessageId")
        `chiefOfStaff` = try object.optional("chiefOfStaff")
        `managedSections` = try object.optional("managedSections")
        `createdBy` = try object.optional("createdBy")
        `reportsTo` = try object.optional("reportsTo")
        `composio` = try object.optional("composio")
        `connectorTools` = try object.optional("connectorTools")
        `connectorScopes` = try object.optional("connectorScopes")
        `outbound` = try object.optional("outbound")
        `phoneApps` = try object.optional("phoneApps")
        `fallback` = try object.optional("fallback")
        `browser` = try object.optional("browser")
        `recordBrowserSteps` = try object.optional("recordBrowserSteps")
        `memoryUpkeep` = try object.optional("memoryUpkeep")
        `cacheKeepWarm` = try object.optional("cacheKeepWarm")
        `helperModel` = try object.optional("helperModel")
        `mcpServers` = try object.optional("mcpServers")
        `toolScope` = try object.optional("toolScope")
        `browserProfile` = try object.optional("browserProfile")
        `playbooks` = try object.optional("playbooks")
        `installedPackage` = try object.optional("installedPackage")
        `busy` = try object.optional("busy")
        `activity` = try object.optional("activity")
        `createdAt` = try object.required("createdAt")
        `visibility` = try object.optional("visibility")
        `messages` = try object.optional("messages")
        `hasMore` = try object.optional("hasMore")
        `activeLeafId` = try object.optional("activeLeafId")
        additionalFields = object.remainder(excluding: ["defaultBot", "sidebarHidden", "welcomed", "access", "yourAccess", "onlyPeopleAdded", "waitingForTeammates", "id", "threadId", "mainThreadId", "tasks", "projects", "name", "title", "description", "soul", "soulHash", "soulDrift", "notifications", "color", "mascotExpression", "mascotBody", "mascotFaceColor", "avatarUrl", "avatarCrop", "avatarZoom", "avatarFocusX", "avatarFocusY", "unread", "modelSelection", "computer", "cloudBackend", "autoStartVps", "vpsAlias", "cwd", "autoApprove", "approvalMode", "alwaysAllow", "speakReplies", "replyStyle", "voice", "voiceNotes", "voiceNoteEveryReply", "xResearch", "memoryEnabled", "parkDirectMessages", "rewound", "pinned", "hidden", "movedTo", "section", "pinnedMessageId", "chiefOfStaff", "managedSections", "createdBy", "reportsTo", "composio", "connectorTools", "connectorScopes", "outbound", "phoneApps", "fallback", "browser", "recordBrowserSteps", "memoryUpkeep", "cacheKeepWarm", "helperModel", "mcpServers", "toolScope", "browserProfile", "playbooks", "installedPackage", "busy", "activity", "createdAt", "visibility", "messages", "hasMore", "activeLeafId"])
        explicitNulls = object.nullKeys.intersection(["defaultBot", "sidebarHidden", "welcomed", "access", "yourAccess", "onlyPeopleAdded", "waitingForTeammates", "id", "threadId", "mainThreadId", "tasks", "projects", "name", "title", "description", "soul", "soulHash", "soulDrift", "notifications", "color", "mascotExpression", "mascotBody", "mascotFaceColor", "avatarUrl", "avatarCrop", "avatarZoom", "avatarFocusX", "avatarFocusY", "unread", "modelSelection", "computer", "cloudBackend", "autoStartVps", "vpsAlias", "cwd", "autoApprove", "approvalMode", "alwaysAllow", "speakReplies", "replyStyle", "voice", "voiceNotes", "voiceNoteEveryReply", "xResearch", "memoryEnabled", "parkDirectMessages", "rewound", "pinned", "hidden", "movedTo", "section", "pinnedMessageId", "chiefOfStaff", "managedSections", "createdBy", "reportsTo", "composio", "connectorTools", "connectorScopes", "outbound", "phoneApps", "fallback", "browser", "recordBrowserSteps", "memoryUpkeep", "cacheKeepWarm", "helperModel", "mcpServers", "toolScope", "browserProfile", "playbooks", "installedPackage", "busy", "activity", "createdAt", "visibility", "messages", "hasMore", "activeLeafId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("defaultBot", `defaultBot`, nulls: explicitNulls)
        try object.putOptional("sidebarHidden", `sidebarHidden`, nulls: explicitNulls)
        try object.putOptional("welcomed", `welcomed`, nulls: explicitNulls)
        try object.putOptional("access", `access`, nulls: explicitNulls)
        try object.putOptional("yourAccess", `yourAccess`, nulls: explicitNulls)
        try object.putOptional("onlyPeopleAdded", `onlyPeopleAdded`, nulls: explicitNulls)
        try object.putOptional("waitingForTeammates", `waitingForTeammates`, nulls: explicitNulls)
        try object.put("id", `id`)
        try object.put("threadId", `threadId`)
        try object.putOptional("mainThreadId", `mainThreadId`, nulls: explicitNulls)
        try object.putOptional("tasks", `tasks`, nulls: explicitNulls)
        try object.putOptional("projects", `projects`, nulls: explicitNulls)
        try object.put("name", `name`)
        try object.put("title", `title`)
        try object.put("description", `description`)
        try object.putOptional("soul", `soul`, nulls: explicitNulls)
        try object.putOptional("soulHash", `soulHash`, nulls: explicitNulls)
        try object.putOptional("soulDrift", `soulDrift`, nulls: explicitNulls)
        try object.put("notifications", `notifications`)
        try object.put("color", `color`)
        try object.putOptional("mascotExpression", `mascotExpression`, nulls: explicitNulls)
        try object.putOptional("mascotBody", `mascotBody`, nulls: explicitNulls)
        try object.putOptional("mascotFaceColor", `mascotFaceColor`, nulls: explicitNulls)
        try object.putNullable("avatarUrl", `avatarUrl`)
        try object.putOptional("avatarCrop", `avatarCrop`, nulls: explicitNulls)
        try object.putOptional("avatarZoom", `avatarZoom`, nulls: explicitNulls)
        try object.putOptional("avatarFocusX", `avatarFocusX`, nulls: explicitNulls)
        try object.putOptional("avatarFocusY", `avatarFocusY`, nulls: explicitNulls)
        try object.put("unread", `unread`)
        try object.put("modelSelection", `modelSelection`)
        try object.putOptional("computer", `computer`, nulls: explicitNulls)
        try object.putOptional("cloudBackend", `cloudBackend`, nulls: explicitNulls)
        try object.putOptional("autoStartVps", `autoStartVps`, nulls: explicitNulls)
        try object.putOptional("vpsAlias", `vpsAlias`, nulls: explicitNulls)
        try object.putOptional("cwd", `cwd`, nulls: explicitNulls)
        try object.putOptional("autoApprove", `autoApprove`, nulls: explicitNulls)
        try object.putOptional("approvalMode", `approvalMode`, nulls: explicitNulls)
        try object.putOptional("alwaysAllow", `alwaysAllow`, nulls: explicitNulls)
        try object.putOptional("speakReplies", `speakReplies`, nulls: explicitNulls)
        try object.putOptional("replyStyle", `replyStyle`, nulls: explicitNulls)
        try object.putOptional("voice", `voice`, nulls: explicitNulls)
        try object.putOptional("voiceNotes", `voiceNotes`, nulls: explicitNulls)
        try object.putOptional("voiceNoteEveryReply", `voiceNoteEveryReply`, nulls: explicitNulls)
        try object.putOptional("xResearch", `xResearch`, nulls: explicitNulls)
        try object.putOptional("memoryEnabled", `memoryEnabled`, nulls: explicitNulls)
        try object.putOptional("parkDirectMessages", `parkDirectMessages`, nulls: explicitNulls)
        try object.putOptional("rewound", `rewound`, nulls: explicitNulls)
        try object.putOptional("pinned", `pinned`, nulls: explicitNulls)
        try object.putOptional("hidden", `hidden`, nulls: explicitNulls)
        try object.putOptional("movedTo", `movedTo`, nulls: explicitNulls)
        try object.putOptional("section", `section`, nulls: explicitNulls)
        try object.putOptional("pinnedMessageId", `pinnedMessageId`, nulls: explicitNulls)
        try object.putOptional("chiefOfStaff", `chiefOfStaff`, nulls: explicitNulls)
        try object.putOptional("managedSections", `managedSections`, nulls: explicitNulls)
        try object.putOptional("createdBy", `createdBy`, nulls: explicitNulls)
        try object.putOptional("reportsTo", `reportsTo`, nulls: explicitNulls)
        try object.putOptional("composio", `composio`, nulls: explicitNulls)
        try object.putOptional("connectorTools", `connectorTools`, nulls: explicitNulls)
        try object.putOptional("connectorScopes", `connectorScopes`, nulls: explicitNulls)
        try object.putOptional("outbound", `outbound`, nulls: explicitNulls)
        try object.putOptional("phoneApps", `phoneApps`, nulls: explicitNulls)
        try object.putOptional("fallback", `fallback`, nulls: explicitNulls)
        try object.putOptional("browser", `browser`, nulls: explicitNulls)
        try object.putOptional("recordBrowserSteps", `recordBrowserSteps`, nulls: explicitNulls)
        try object.putOptional("memoryUpkeep", `memoryUpkeep`, nulls: explicitNulls)
        try object.putOptional("cacheKeepWarm", `cacheKeepWarm`, nulls: explicitNulls)
        try object.putOptional("helperModel", `helperModel`, nulls: explicitNulls)
        try object.putOptional("mcpServers", `mcpServers`, nulls: explicitNulls)
        try object.putOptional("toolScope", `toolScope`, nulls: explicitNulls)
        try object.putOptional("browserProfile", `browserProfile`, nulls: explicitNulls)
        try object.putOptional("playbooks", `playbooks`, nulls: explicitNulls)
        try object.putOptional("installedPackage", `installedPackage`, nulls: explicitNulls)
        try object.putOptional("busy", `busy`, nulls: explicitNulls)
        try object.putOptional("activity", `activity`, nulls: explicitNulls)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("visibility", `visibility`, nulls: explicitNulls)
        try object.putOptional("messages", `messages`, nulls: explicitNulls)
        try object.putOptional("hasMore", `hasMore`, nulls: explicitNulls)
        try object.putOptional("activeLeafId", `activeLeafId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct WireTask: WireModel {
    public var `inbox`: Bool?
    public var `openAsks`: Double?
    public var `inboxChangedAt`: Double?
    public var `waitingForTeammates`: Bool?
    public var `threadId`: String
    public var `title`: String
    public var `createdAt`: Double
    public var `titleFromFirstMessage`: Bool?
    public var `sharedChat`: Bool?
    public var `projectId`: String?
    public var `routineRunId`: String?
    public var `outside`: Bool?
    public var `botApi`: Bool?
    public var `openedBy`: TaskOpenedBy?
    public var `private`: Bool?
    public var `shared`: Bool?
    public var `sharedWith`: WireTaskSharedWith?
    public var `askedBy`: ResolvedSender?
    public var `closedBy`: TaskClosedBy?
    public var `archivedAt`: Double?
    public var `pinned`: Bool?
    public var `link`: String?
    public var `linkAuto`: Bool?
    public var `updatedAt`: Double?
    public var `lastThreadOrderAt`: Double?
    public var `snoozedUntil`: Double?
    public var `modelSelection`: ModelSelection?
    public var `followsBotModel`: Bool?
    public var `approvalMode`: ApprovalMode?
    public var `autoApprove`: Bool?
    public var `alwaysAllow`: [String]?
    public var `unread`: Bool?
    public var `lastReadMessageId`: String?
    public var `rewound`: Bool?
    public var `pinnedMessageId`: String?
    public var `activity`: BotActivity?
    public var `busy`: Bool?
    public var `turnStartedAt`: Double?
    public var `surface`: Surface?
    public var `surfaceAuto`: Bool?
    public var `usage`: TaskUsage?
    public var `cacheKeepWarm`: CacheKeepWarmStatus?
    public var `cwd`: String?
    public var `setupRequest`: WireTaskSetupRequest?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `threadId`: String,
        `title`: String,
        `createdAt`: Double,
        `inbox`: Bool? = nil,
        `openAsks`: Double? = nil,
        `inboxChangedAt`: Double? = nil,
        `waitingForTeammates`: Bool? = nil,
        `titleFromFirstMessage`: Bool? = nil,
        `sharedChat`: Bool? = nil,
        `projectId`: String? = nil,
        `routineRunId`: String? = nil,
        `outside`: Bool? = nil,
        `botApi`: Bool? = nil,
        `openedBy`: TaskOpenedBy? = nil,
        `private`: Bool? = nil,
        `shared`: Bool? = nil,
        `sharedWith`: WireTaskSharedWith? = nil,
        `askedBy`: ResolvedSender? = nil,
        `closedBy`: TaskClosedBy? = nil,
        `archivedAt`: Double? = nil,
        `pinned`: Bool? = nil,
        `link`: String? = nil,
        `linkAuto`: Bool? = nil,
        `updatedAt`: Double? = nil,
        `lastThreadOrderAt`: Double? = nil,
        `snoozedUntil`: Double? = nil,
        `modelSelection`: ModelSelection? = nil,
        `followsBotModel`: Bool? = nil,
        `approvalMode`: ApprovalMode? = nil,
        `autoApprove`: Bool? = nil,
        `alwaysAllow`: [String]? = nil,
        `unread`: Bool? = nil,
        `lastReadMessageId`: String? = nil,
        `rewound`: Bool? = nil,
        `pinnedMessageId`: String? = nil,
        `activity`: BotActivity? = nil,
        `busy`: Bool? = nil,
        `turnStartedAt`: Double? = nil,
        `surface`: Surface? = nil,
        `surfaceAuto`: Bool? = nil,
        `usage`: TaskUsage? = nil,
        `cacheKeepWarm`: CacheKeepWarmStatus? = nil,
        `cwd`: String? = nil,
        `setupRequest`: WireTaskSetupRequest? = nil
    ) {
        self.`inbox` = `inbox`
        self.`openAsks` = `openAsks`
        self.`inboxChangedAt` = `inboxChangedAt`
        self.`waitingForTeammates` = `waitingForTeammates`
        self.`threadId` = `threadId`
        self.`title` = `title`
        self.`createdAt` = `createdAt`
        self.`titleFromFirstMessage` = `titleFromFirstMessage`
        self.`sharedChat` = `sharedChat`
        self.`projectId` = `projectId`
        self.`routineRunId` = `routineRunId`
        self.`outside` = `outside`
        self.`botApi` = `botApi`
        self.`openedBy` = `openedBy`
        self.`private` = `private`
        self.`shared` = `shared`
        self.`sharedWith` = `sharedWith`
        self.`askedBy` = `askedBy`
        self.`closedBy` = `closedBy`
        self.`archivedAt` = `archivedAt`
        self.`pinned` = `pinned`
        self.`link` = `link`
        self.`linkAuto` = `linkAuto`
        self.`updatedAt` = `updatedAt`
        self.`lastThreadOrderAt` = `lastThreadOrderAt`
        self.`snoozedUntil` = `snoozedUntil`
        self.`modelSelection` = `modelSelection`
        self.`followsBotModel` = `followsBotModel`
        self.`approvalMode` = `approvalMode`
        self.`autoApprove` = `autoApprove`
        self.`alwaysAllow` = `alwaysAllow`
        self.`unread` = `unread`
        self.`lastReadMessageId` = `lastReadMessageId`
        self.`rewound` = `rewound`
        self.`pinnedMessageId` = `pinnedMessageId`
        self.`activity` = `activity`
        self.`busy` = `busy`
        self.`turnStartedAt` = `turnStartedAt`
        self.`surface` = `surface`
        self.`surfaceAuto` = `surfaceAuto`
        self.`usage` = `usage`
        self.`cacheKeepWarm` = `cacheKeepWarm`
        self.`cwd` = `cwd`
        self.`setupRequest` = `setupRequest`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `inbox` = try object.optional("inbox")
        `openAsks` = try object.optional("openAsks")
        `inboxChangedAt` = try object.optional("inboxChangedAt")
        `waitingForTeammates` = try object.optional("waitingForTeammates")
        `threadId` = try object.required("threadId")
        `title` = try object.required("title")
        `createdAt` = try object.required("createdAt")
        `titleFromFirstMessage` = try object.optional("titleFromFirstMessage")
        `sharedChat` = try object.optional("sharedChat")
        `projectId` = try object.optional("projectId")
        `routineRunId` = try object.optional("routineRunId")
        `outside` = try object.optional("outside")
        `botApi` = try object.optional("botApi")
        `openedBy` = try object.optional("openedBy")
        `private` = try object.optional("private")
        `shared` = try object.optional("shared")
        `sharedWith` = try object.optional("sharedWith")
        `askedBy` = try object.optional("askedBy")
        `closedBy` = try object.optional("closedBy")
        `archivedAt` = try object.optional("archivedAt")
        `pinned` = try object.optional("pinned")
        `link` = try object.optional("link")
        `linkAuto` = try object.optional("linkAuto")
        `updatedAt` = try object.optional("updatedAt")
        `lastThreadOrderAt` = try object.optional("lastThreadOrderAt")
        `snoozedUntil` = try object.optional("snoozedUntil")
        `modelSelection` = try object.optional("modelSelection")
        `followsBotModel` = try object.optional("followsBotModel")
        `approvalMode` = try object.optional("approvalMode")
        `autoApprove` = try object.optional("autoApprove")
        `alwaysAllow` = try object.optional("alwaysAllow")
        `unread` = try object.optional("unread")
        `lastReadMessageId` = try object.optional("lastReadMessageId")
        `rewound` = try object.optional("rewound")
        `pinnedMessageId` = try object.optional("pinnedMessageId")
        `activity` = try object.optional("activity")
        `busy` = try object.optional("busy")
        `turnStartedAt` = try object.optional("turnStartedAt")
        `surface` = try object.optional("surface")
        `surfaceAuto` = try object.optional("surfaceAuto")
        `usage` = try object.optional("usage")
        `cacheKeepWarm` = try object.optional("cacheKeepWarm")
        `cwd` = try object.optional("cwd")
        `setupRequest` = try object.optional("setupRequest")
        additionalFields = object.remainder(excluding: ["inbox", "openAsks", "inboxChangedAt", "waitingForTeammates", "threadId", "title", "createdAt", "titleFromFirstMessage", "sharedChat", "projectId", "routineRunId", "outside", "botApi", "openedBy", "private", "shared", "sharedWith", "askedBy", "closedBy", "archivedAt", "pinned", "link", "linkAuto", "updatedAt", "lastThreadOrderAt", "snoozedUntil", "modelSelection", "followsBotModel", "approvalMode", "autoApprove", "alwaysAllow", "unread", "lastReadMessageId", "rewound", "pinnedMessageId", "activity", "busy", "turnStartedAt", "surface", "surfaceAuto", "usage", "cacheKeepWarm", "cwd", "setupRequest"])
        explicitNulls = object.nullKeys.intersection(["inbox", "openAsks", "inboxChangedAt", "waitingForTeammates", "threadId", "title", "createdAt", "titleFromFirstMessage", "sharedChat", "projectId", "routineRunId", "outside", "botApi", "openedBy", "private", "shared", "sharedWith", "askedBy", "closedBy", "archivedAt", "pinned", "link", "linkAuto", "updatedAt", "lastThreadOrderAt", "snoozedUntil", "modelSelection", "followsBotModel", "approvalMode", "autoApprove", "alwaysAllow", "unread", "lastReadMessageId", "rewound", "pinnedMessageId", "activity", "busy", "turnStartedAt", "surface", "surfaceAuto", "usage", "cacheKeepWarm", "cwd", "setupRequest"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("inbox", `inbox`, nulls: explicitNulls)
        try object.putOptional("openAsks", `openAsks`, nulls: explicitNulls)
        try object.putOptional("inboxChangedAt", `inboxChangedAt`, nulls: explicitNulls)
        try object.putOptional("waitingForTeammates", `waitingForTeammates`, nulls: explicitNulls)
        try object.put("threadId", `threadId`)
        try object.put("title", `title`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("titleFromFirstMessage", `titleFromFirstMessage`, nulls: explicitNulls)
        try object.putOptional("sharedChat", `sharedChat`, nulls: explicitNulls)
        try object.putOptional("projectId", `projectId`, nulls: explicitNulls)
        try object.putOptional("routineRunId", `routineRunId`, nulls: explicitNulls)
        try object.putOptional("outside", `outside`, nulls: explicitNulls)
        try object.putOptional("botApi", `botApi`, nulls: explicitNulls)
        try object.putOptional("openedBy", `openedBy`, nulls: explicitNulls)
        try object.putOptional("private", `private`, nulls: explicitNulls)
        try object.putOptional("shared", `shared`, nulls: explicitNulls)
        try object.putOptional("sharedWith", `sharedWith`, nulls: explicitNulls)
        try object.putOptional("askedBy", `askedBy`, nulls: explicitNulls)
        try object.putOptional("closedBy", `closedBy`, nulls: explicitNulls)
        try object.putOptional("archivedAt", `archivedAt`, nulls: explicitNulls)
        try object.putOptional("pinned", `pinned`, nulls: explicitNulls)
        try object.putOptional("link", `link`, nulls: explicitNulls)
        try object.putOptional("linkAuto", `linkAuto`, nulls: explicitNulls)
        try object.putOptional("updatedAt", `updatedAt`, nulls: explicitNulls)
        try object.putOptional("lastThreadOrderAt", `lastThreadOrderAt`, nulls: explicitNulls)
        try object.putOptional("snoozedUntil", `snoozedUntil`, nulls: explicitNulls)
        try object.putOptional("modelSelection", `modelSelection`, nulls: explicitNulls)
        try object.putOptional("followsBotModel", `followsBotModel`, nulls: explicitNulls)
        try object.putOptional("approvalMode", `approvalMode`, nulls: explicitNulls)
        try object.putOptional("autoApprove", `autoApprove`, nulls: explicitNulls)
        try object.putOptional("alwaysAllow", `alwaysAllow`, nulls: explicitNulls)
        try object.putOptional("unread", `unread`, nulls: explicitNulls)
        try object.putOptional("lastReadMessageId", `lastReadMessageId`, nulls: explicitNulls)
        try object.putOptional("rewound", `rewound`, nulls: explicitNulls)
        try object.putOptional("pinnedMessageId", `pinnedMessageId`, nulls: explicitNulls)
        try object.putOptional("activity", `activity`, nulls: explicitNulls)
        try object.putOptional("busy", `busy`, nulls: explicitNulls)
        try object.putOptional("turnStartedAt", `turnStartedAt`, nulls: explicitNulls)
        try object.putOptional("surface", `surface`, nulls: explicitNulls)
        try object.putOptional("surfaceAuto", `surfaceAuto`, nulls: explicitNulls)
        try object.putOptional("usage", `usage`, nulls: explicitNulls)
        try object.putOptional("cacheKeepWarm", `cacheKeepWarm`, nulls: explicitNulls)
        try object.putOptional("cwd", `cwd`, nulls: explicitNulls)
        try object.putOptional("setupRequest", `setupRequest`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct TaskOpenedBy: WireModel {
    public var `botId`: String
    public var `name`: String
    public var `delegationId`: String?
    public var `kind`: TaskOpenedByKind?
    public var `burstId`: String?
    public var `threadId`: String?
    public var `roomLane`: Bool?
    public var `forOwner`: Bool?
    public var `at`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `botId`: String,
        `name`: String,
        `at`: Double,
        `delegationId`: String? = nil,
        `kind`: TaskOpenedByKind? = nil,
        `burstId`: String? = nil,
        `threadId`: String? = nil,
        `roomLane`: Bool? = nil,
        `forOwner`: Bool? = nil
    ) {
        self.`botId` = `botId`
        self.`name` = `name`
        self.`delegationId` = `delegationId`
        self.`kind` = `kind`
        self.`burstId` = `burstId`
        self.`threadId` = `threadId`
        self.`roomLane` = `roomLane`
        self.`forOwner` = `forOwner`
        self.`at` = `at`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `name` = try object.required("name")
        `delegationId` = try object.optional("delegationId")
        `kind` = try object.optional("kind")
        `burstId` = try object.optional("burstId")
        `threadId` = try object.optional("threadId")
        `roomLane` = try object.optional("roomLane")
        `forOwner` = try object.optional("forOwner")
        `at` = try object.required("at")
        additionalFields = object.remainder(excluding: ["botId", "name", "delegationId", "kind", "burstId", "threadId", "roomLane", "forOwner", "at"])
        explicitNulls = object.nullKeys.intersection(["botId", "name", "delegationId", "kind", "burstId", "threadId", "roomLane", "forOwner", "at"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("name", `name`)
        try object.putOptional("delegationId", `delegationId`, nulls: explicitNulls)
        try object.putOptional("kind", `kind`, nulls: explicitNulls)
        try object.putOptional("burstId", `burstId`, nulls: explicitNulls)
        try object.putOptional("threadId", `threadId`, nulls: explicitNulls)
        try object.putOptional("roomLane", `roomLane`, nulls: explicitNulls)
        try object.putOptional("forOwner", `forOwner`, nulls: explicitNulls)
        try object.put("at", `at`)
        try object.encode(to: encoder)
    }
}

public enum TaskOpenedByKind: WireModel, Hashable, Sendable {
    case `pair`
    case `work`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "pair": self = .`pair`
        case "work": self = .`work`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`pair`: return "pair"
        case .`work`: return "work"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct WireTaskSharedWith: WireModel {
    public var `name`: String
    public var `byYou`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`name`: String, `byYou`: Bool? = nil) {
        self.`name` = `name`
        self.`byYou` = `byYou`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `byYou` = try object.optional("byYou")
        additionalFields = object.remainder(excluding: ["name", "byYou"])
        explicitNulls = object.nullKeys.intersection(["name", "byYou"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.putOptional("byYou", `byYou`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct TaskClosedBy: WireModel {
    public var `botId`: String
    public var `name`: String
    public var `at`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `name`: String, `at`: Double) {
        self.`botId` = `botId`
        self.`name` = `name`
        self.`at` = `at`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `name` = try object.required("name")
        `at` = try object.required("at")
        additionalFields = object.remainder(excluding: ["botId", "name", "at"])
        explicitNulls = object.nullKeys.intersection(["botId", "name", "at"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("name", `name`)
        try object.put("at", `at`)
        try object.encode(to: encoder)
    }
}

public enum BotActivity: WireModel, Hashable, Sendable {
    case `working`
    case `waitingOnYou`
    case `idle`
    case `noSignal`
    case `dead`
    case `parkedComputer`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "working": self = .`working`
        case "waiting-on-you": self = .`waitingOnYou`
        case "idle": self = .`idle`
        case "no-signal": self = .`noSignal`
        case "dead": self = .`dead`
        case "parked.computer": self = .`parkedComputer`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`working`: return "working"
        case .`waitingOnYou`: return "waiting-on-you"
        case .`idle`: return "idle"
        case .`noSignal`: return "no-signal"
        case .`dead`: return "dead"
        case .`parkedComputer`: return "parked.computer"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct TaskUsage: WireModel {
    public var `input`: Double
    public var `output`: Double
    public var `cachedInput`: Double?
    public var `costUsd`: Double?
    public var `turns`: Double
    public var `lastTurn`: TaskUsageLastTurn?
    public var `context`: TaskUsageContext?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `input`: Double,
        `output`: Double,
        `costUsd`: Double?,
        `turns`: Double,
        `cachedInput`: Double? = nil,
        `lastTurn`: TaskUsageLastTurn? = nil,
        `context`: TaskUsageContext? = nil
    ) {
        self.`input` = `input`
        self.`output` = `output`
        self.`cachedInput` = `cachedInput`
        self.`costUsd` = `costUsd`
        self.`turns` = `turns`
        self.`lastTurn` = `lastTurn`
        self.`context` = `context`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `input` = try object.required("input")
        `output` = try object.required("output")
        `cachedInput` = try object.optional("cachedInput")
        `costUsd` = try object.nullable("costUsd")
        `turns` = try object.required("turns")
        `lastTurn` = try object.optional("lastTurn")
        `context` = try object.optional("context")
        additionalFields = object.remainder(excluding: ["input", "output", "cachedInput", "costUsd", "turns", "lastTurn", "context"])
        explicitNulls = object.nullKeys.intersection(["input", "output", "cachedInput", "costUsd", "turns", "lastTurn", "context"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("input", `input`)
        try object.put("output", `output`)
        try object.putOptional("cachedInput", `cachedInput`, nulls: explicitNulls)
        try object.putNullable("costUsd", `costUsd`)
        try object.put("turns", `turns`)
        try object.putOptional("lastTurn", `lastTurn`, nulls: explicitNulls)
        try object.putOptional("context", `context`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct TaskUsageLastTurn: WireModel {
    public var `input`: Double
    public var `output`: Double
    public var `cachedInput`: Double?
    public var `costUsd`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`input`: Double, `output`: Double, `costUsd`: Double?, `cachedInput`: Double? = nil) {
        self.`input` = `input`
        self.`output` = `output`
        self.`cachedInput` = `cachedInput`
        self.`costUsd` = `costUsd`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `input` = try object.required("input")
        `output` = try object.required("output")
        `cachedInput` = try object.optional("cachedInput")
        `costUsd` = try object.nullable("costUsd")
        additionalFields = object.remainder(excluding: ["input", "output", "cachedInput", "costUsd"])
        explicitNulls = object.nullKeys.intersection(["input", "output", "cachedInput", "costUsd"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("input", `input`)
        try object.put("output", `output`)
        try object.putOptional("cachedInput", `cachedInput`, nulls: explicitNulls)
        try object.putNullable("costUsd", `costUsd`)
        try object.encode(to: encoder)
    }
}

public struct TaskUsageContext: WireModel {
    public var `tokens`: Double
    public var `window`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`tokens`: Double, `window`: Double? = nil) {
        self.`tokens` = `tokens`
        self.`window` = `window`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `tokens` = try object.required("tokens")
        `window` = try object.optional("window")
        additionalFields = object.remainder(excluding: ["tokens", "window"])
        explicitNulls = object.nullKeys.intersection(["tokens", "window"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("tokens", `tokens`)
        try object.putOptional("window", `window`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct CacheKeepWarmStatus: WireModel {
    public var `state`: CacheKeepWarmStatusState
    public var `until`: Double?
    public var `nextPingAt`: Double?
    public var `last`: CacheKeepWarmStatusLast?
    public var `stopped`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `state`: CacheKeepWarmStatusState,
        `until`: Double? = nil,
        `nextPingAt`: Double? = nil,
        `last`: CacheKeepWarmStatusLast? = nil,
        `stopped`: String? = nil
    ) {
        self.`state` = `state`
        self.`until` = `until`
        self.`nextPingAt` = `nextPingAt`
        self.`last` = `last`
        self.`stopped` = `stopped`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `state` = try object.required("state")
        `until` = try object.optional("until")
        `nextPingAt` = try object.optional("nextPingAt")
        `last` = try object.optional("last")
        `stopped` = try object.optional("stopped")
        additionalFields = object.remainder(excluding: ["state", "until", "nextPingAt", "last", "stopped"])
        explicitNulls = object.nullKeys.intersection(["state", "until", "nextPingAt", "last", "stopped"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("state", `state`)
        try object.putOptional("until", `until`, nulls: explicitNulls)
        try object.putOptional("nextPingAt", `nextPingAt`, nulls: explicitNulls)
        try object.putOptional("last", `last`, nulls: explicitNulls)
        try object.putOptional("stopped", `stopped`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum CacheKeepWarmStatusState: WireModel, Hashable, Sendable {
    case `warm`
    case `stopped`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "warm": self = .`warm`
        case "stopped": self = .`stopped`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`warm`: return "warm"
        case .`stopped`: return "stopped"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct CacheKeepWarmStatusLast: WireModel {
    public var `at`: Double
    public var `read`: Double
    public var `write`: Double
    public var `costUsd`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`at`: Double, `read`: Double, `write`: Double, `costUsd`: Double?) {
        self.`at` = `at`
        self.`read` = `read`
        self.`write` = `write`
        self.`costUsd` = `costUsd`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `at` = try object.required("at")
        `read` = try object.required("read")
        `write` = try object.required("write")
        `costUsd` = try object.nullable("costUsd")
        additionalFields = object.remainder(excluding: ["at", "read", "write", "costUsd"])
        explicitNulls = object.nullKeys.intersection(["at", "read", "write", "costUsd"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("at", `at`)
        try object.put("read", `read`)
        try object.put("write", `write`)
        try object.putNullable("costUsd", `costUsd`)
        try object.encode(to: encoder)
    }
}

public struct WireTaskSetupRequest: WireModel {
    public var `at`: Double
    public var `by`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`at`: Double, `by`: String? = nil) {
        self.`at` = `at`
        self.`by` = `by`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `at` = try object.required("at")
        `by` = try object.optional("by")
        additionalFields = object.remainder(excluding: ["at", "by"])
        explicitNulls = object.nullKeys.intersection(["at", "by"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("at", `at`)
        try object.putOptional("by", `by`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct BotProject: WireModel {
    public var `id`: String
    public var `name`: String
    public var `emoji`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`id`: String, `name`: String, `emoji`: String? = nil) {
        self.`id` = `id`
        self.`name` = `name`
        self.`emoji` = `emoji`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `name` = try object.required("name")
        `emoji` = try object.optional("emoji")
        additionalFields = object.remainder(excluding: ["id", "name", "emoji"])
        explicitNulls = object.nullKeys.intersection(["id", "name", "emoji"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("name", `name`)
        try object.putOptional("emoji", `emoji`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public typealias BotExpression = String

public enum WireBotComputer: WireModel, Hashable, Sendable {
    case `cloud`
    case `vm`
    case `local`
    case `browser`
    case `off`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "cloud": self = .`cloud`
        case "vm": self = .`vm`
        case "local": self = .`local`
        case "browser": self = .`browser`
        case "off": self = .`off`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`cloud`: return "cloud"
        case .`vm`: return "vm"
        case .`local`: return "local"
        case .`browser`: return "browser"
        case .`off`: return "off"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum CloudBackend: WireModel, Hashable, Sendable {
    case `box`
    case `vps`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "box": self = .`box`
        case "vps": self = .`vps`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`box`: return "box"
        case .`vps`: return "vps"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct BotMovedTo: WireModel {
    public var `team`: BotMovedToTeam
    public var `state`: BotMovedToState
    public var `at`: Double
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`team`: BotMovedToTeam, `state`: BotMovedToState, `at`: Double) {
        self.`team` = `team`
        self.`state` = `state`
        self.`at` = `at`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `team` = try object.required("team")
        `state` = try object.required("state")
        `at` = try object.required("at")
        additionalFields = object.remainder(excluding: ["team", "state", "at"])
        explicitNulls = object.nullKeys.intersection(["team", "state", "at"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("team", `team`)
        try object.put("state", `state`)
        try object.put("at", `at`)
        try object.encode(to: encoder)
    }
}

public struct BotMovedToTeam: WireModel {
    public var `id`: String
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`id`: String, `name`: String) {
        self.`id` = `id`
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["id", "name"])
        explicitNulls = object.nullKeys.intersection(["id", "name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public enum BotMovedToState: WireModel, Hashable, Sendable {
    case `moving`
    case `moved`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "moving": self = .`moving`
        case "moved": self = .`moved`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`moving`: return "moving"
        case .`moved`: return "moved"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ConnectorToolGrant: WireModel {
    public var `tools`: ConnectorToolGrantTools
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`tools`: ConnectorToolGrantTools) {
        self.`tools` = `tools`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `tools` = try object.required("tools")
        additionalFields = object.remainder(excluding: ["tools"])
        explicitNulls = object.nullKeys.intersection(["tools"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("tools", `tools`)
        try object.encode(to: encoder)
    }
}

public indirect enum ConnectorToolGrantTools: WireModel {
    case string(String)
    case array([String])
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if raw == .string("*"), let value = try? raw.decode(String.self) { self = .string(value); return }
        if let value = try? raw.decode([String].self) { self = .array(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .string(let value): try value.encode(to: encoder)
        case .array(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public struct WireBotConnectorScopes: WireModel {
    public var `apps`: [String: WireBotConnectorScopesAppsValue]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`apps`: [String: WireBotConnectorScopesAppsValue]) {
        self.`apps` = `apps`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `apps` = try object.required("apps")
        additionalFields = object.remainder(excluding: ["apps"])
        explicitNulls = object.nullKeys.intersection(["apps"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("apps", `apps`)
        try object.encode(to: encoder)
    }
}

public enum WireBotConnectorScopesAppsValue: WireModel, Hashable, Sendable {
    case `read`
    case `write`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "read": self = .`read`
        case "write": self = .`write`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`read`: return "read"
        case .`write`: return "write"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct WireBotOutbound: WireModel {
    public var `policy`: WireBotOutboundPolicy
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`policy`: WireBotOutboundPolicy) {
        self.`policy` = `policy`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `policy` = try object.required("policy")
        additionalFields = object.remainder(excluding: ["policy"])
        explicitNulls = object.nullKeys.intersection(["policy"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("policy", `policy`)
        try object.encode(to: encoder)
    }
}

public enum WireBotOutboundPolicy: WireModel, Hashable, Sendable {
    case `ask`
    case `allow`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "ask": self = .`ask`
        case "allow": self = .`allow`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`ask`: return "ask"
        case .`allow`: return "allow"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct WireBotFallbackElement: WireModel {
    public var `instanceId`: String
    public var `model`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`instanceId`: String, `model`: String) {
        self.`instanceId` = `instanceId`
        self.`model` = `model`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `instanceId` = try object.required("instanceId")
        `model` = try object.required("model")
        additionalFields = object.remainder(excluding: ["instanceId", "model"])
        explicitNulls = object.nullKeys.intersection(["instanceId", "model"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("instanceId", `instanceId`)
        try object.put("model", `model`)
        try object.encode(to: encoder)
    }
}

public struct InstalledPlaybook: WireModel {
    public var `key`: String
    public var `name`: String
    public var `summary`: String
    public var `triggers`: [String]
    public var `instructions`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `key`: String,
        `name`: String,
        `summary`: String,
        `triggers`: [String],
        `instructions`: String
    ) {
        self.`key` = `key`
        self.`name` = `name`
        self.`summary` = `summary`
        self.`triggers` = `triggers`
        self.`instructions` = `instructions`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `key` = try object.required("key")
        `name` = try object.required("name")
        `summary` = try object.required("summary")
        `triggers` = try object.required("triggers")
        `instructions` = try object.required("instructions")
        additionalFields = object.remainder(excluding: ["key", "name", "summary", "triggers", "instructions"])
        explicitNulls = object.nullKeys.intersection(["key", "name", "summary", "triggers", "instructions"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("key", `key`)
        try object.put("name", `name`)
        try object.put("summary", `summary`)
        try object.put("triggers", `triggers`)
        try object.put("instructions", `instructions`)
        try object.encode(to: encoder)
    }
}

public struct InstalledPackageMetadata: WireModel {
    public var `id`: String
    public var `name`: String
    public var `release`: String
    public var `requiredApps`: [InstalledPackageMetadataRequiredAppsElement]
    public var `source`: InstalledPackageMetadataSource?
    public var `installId`: String?
    public var `agentKey`: String?
    public var `presetKey`: String?
    public var `suggestedApproval`: InstalledPackageMetadataSuggestedApproval?
    public var `publisher`: InstalledPackageMetadataPublisher?
    public var `ref`: String?
    public var `sha256`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `name`: String,
        `release`: String,
        `requiredApps`: [InstalledPackageMetadataRequiredAppsElement],
        `source`: InstalledPackageMetadataSource? = nil,
        `installId`: String? = nil,
        `agentKey`: String? = nil,
        `presetKey`: String? = nil,
        `suggestedApproval`: InstalledPackageMetadataSuggestedApproval? = nil,
        `publisher`: InstalledPackageMetadataPublisher? = nil,
        `ref`: String? = nil,
        `sha256`: String? = nil
    ) {
        self.`id` = `id`
        self.`name` = `name`
        self.`release` = `release`
        self.`requiredApps` = `requiredApps`
        self.`source` = `source`
        self.`installId` = `installId`
        self.`agentKey` = `agentKey`
        self.`presetKey` = `presetKey`
        self.`suggestedApproval` = `suggestedApproval`
        self.`publisher` = `publisher`
        self.`ref` = `ref`
        self.`sha256` = `sha256`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `name` = try object.required("name")
        `release` = try object.required("release")
        `requiredApps` = try object.required("requiredApps")
        `source` = try object.optional("source")
        `installId` = try object.optional("installId")
        `agentKey` = try object.optional("agentKey")
        `presetKey` = try object.optional("presetKey")
        `suggestedApproval` = try object.optional("suggestedApproval")
        `publisher` = try object.optional("publisher")
        `ref` = try object.optional("ref")
        `sha256` = try object.optional("sha256")
        additionalFields = object.remainder(excluding: ["id", "name", "release", "requiredApps", "source", "installId", "agentKey", "presetKey", "suggestedApproval", "publisher", "ref", "sha256"])
        explicitNulls = object.nullKeys.intersection(["id", "name", "release", "requiredApps", "source", "installId", "agentKey", "presetKey", "suggestedApproval", "publisher", "ref", "sha256"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("name", `name`)
        try object.put("release", `release`)
        try object.put("requiredApps", `requiredApps`)
        try object.putOptional("source", `source`, nulls: explicitNulls)
        try object.putOptional("installId", `installId`, nulls: explicitNulls)
        try object.putOptional("agentKey", `agentKey`, nulls: explicitNulls)
        try object.putOptional("presetKey", `presetKey`, nulls: explicitNulls)
        try object.putOptional("suggestedApproval", `suggestedApproval`, nulls: explicitNulls)
        try object.putOptional("publisher", `publisher`, nulls: explicitNulls)
        try object.putOptional("ref", `ref`, nulls: explicitNulls)
        try object.putOptional("sha256", `sha256`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct InstalledPackageMetadataRequiredAppsElement: WireModel {
    public var `slug`: String
    public var `label`: String
    public var `reason`: String
    public var `optional`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`slug`: String, `label`: String, `reason`: String, `optional`: Bool? = nil) {
        self.`slug` = `slug`
        self.`label` = `label`
        self.`reason` = `reason`
        self.`optional` = `optional`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `slug` = try object.required("slug")
        `label` = try object.required("label")
        `reason` = try object.required("reason")
        `optional` = try object.optional("optional")
        additionalFields = object.remainder(excluding: ["slug", "label", "reason", "optional"])
        explicitNulls = object.nullKeys.intersection(["slug", "label", "reason", "optional"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("slug", `slug`)
        try object.put("label", `label`)
        try object.put("reason", `reason`)
        try object.putOptional("optional", `optional`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum InstalledPackageMetadataSource: WireModel, Hashable, Sendable {
    case `file`
    case `org`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "file": self = .`file`
        case "org": self = .`org`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`file`: return "file"
        case .`org`: return "org"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public enum InstalledPackageMetadataSuggestedApproval: WireModel, Hashable, Sendable {
    case `ask`
    case `auto`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "ask": self = .`ask`
        case "auto": self = .`auto`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`ask`: return "ask"
        case .`auto`: return "auto"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct InstalledPackageMetadataPublisher: WireModel {
    public var `organizationId`: String
    public var `slug`: String
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`organizationId`: String, `slug`: String, `name`: String) {
        self.`organizationId` = `organizationId`
        self.`slug` = `slug`
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `organizationId` = try object.required("organizationId")
        `slug` = try object.required("slug")
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["organizationId", "slug", "name"])
        explicitNulls = object.nullKeys.intersection(["organizationId", "slug", "name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("organizationId", `organizationId`)
        try object.put("slug", `slug`)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public struct BotVisibilityValueValue3: WireModel {
    public var `people`: [String]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`people`: [String]) {
        self.`people` = `people`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `people` = try object.required("people")
        additionalFields = object.remainder(excluding: ["people"])
        explicitNulls = object.nullKeys.intersection(["people"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("people", `people`)
        try object.encode(to: encoder)
    }
}

public indirect enum BotVisibilityValue: WireModel {
    case string(String)
    case stringAlternative2(String)
    case object(BotVisibilityValueValue3)
    case unknown(kind: String, raw: JSONValue)

    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        if raw == .string("everyone"), let value = try? raw.decode(String.self) { self = .string(value); return }
        if raw == .string("admins"), let value = try? raw.decode(String.self) { self = .stringAlternative2(value); return }
        if let value = try? raw.decode(BotVisibilityValueValue3.self) { self = .object(value); return }
        self = .unknown(kind: raw["kind"]?.stringValue ?? raw["type"]?.stringValue ?? "untagged", raw: raw)
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .string(let value): try value.encode(to: encoder)
        case .stringAlternative2(let value): try value.encode(to: encoder)
        case .object(let value): try value.encode(to: encoder)
        case .unknown(_, let raw): try raw.encode(to: encoder)
        }
    }
}

public typealias BotVisibility = BotVisibilityValue

public struct WireGroup: WireModel {
    public var `usage`: GroupThreadUsage?
    public var `chiefAbsent`: WireGroupChiefAbsent?
    public var `memberContext`: [String: WireGroupMemberContextValue]?
    public var `id`: String
    public var `threadId`: String
    public var `tasks`: [GroupTask]?
    public var `name`: String
    public var `memberIds`: [String]
    public var `defaultResponder`: GroupDefaultResponder
    public var `bulletin`: String
    public var `description`: String?
    public var `unread`: Bool
    public var `lastReadMessageId`: String?
    public var `createdAt`: Double
    public var `dm`: Bool?
    public var `busyBotId`: String?
    public var `turnStartedAt`: Double?
    public var `cwd`: String?
    public var `pinnedCwd`: String?
    public var `pinnedMessageId`: String?
    public var `section`: String?
    public var `setupCompletedAt`: Double?
    public var `setupSkippedAt`: Double?
    public var `audienceFloor`: BotVisibility?
    public var `working`: Bool
    public var `turnTimeoutMinutes`: Double?
    public var `holds`: [String: RoomHold]?
    public var `heldMessages`: [String: [RoomHeldMessage]]?
    public var `queue`: [RoomQueueEntry]?
    public var `messages`: [WireMessage]?
    public var `hasMore`: Bool?
    public var `activeLeafId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `id`: String,
        `threadId`: String,
        `name`: String,
        `memberIds`: [String],
        `defaultResponder`: GroupDefaultResponder,
        `bulletin`: String,
        `unread`: Bool,
        `createdAt`: Double,
        `working`: Bool,
        `usage`: GroupThreadUsage? = nil,
        `chiefAbsent`: WireGroupChiefAbsent? = nil,
        `memberContext`: [String: WireGroupMemberContextValue]? = nil,
        `tasks`: [GroupTask]? = nil,
        `description`: String? = nil,
        `lastReadMessageId`: String? = nil,
        `dm`: Bool? = nil,
        `busyBotId`: String? = nil,
        `turnStartedAt`: Double? = nil,
        `cwd`: String? = nil,
        `pinnedCwd`: String? = nil,
        `pinnedMessageId`: String? = nil,
        `section`: String? = nil,
        `setupCompletedAt`: Double? = nil,
        `setupSkippedAt`: Double? = nil,
        `audienceFloor`: BotVisibility? = nil,
        `turnTimeoutMinutes`: Double? = nil,
        `holds`: [String: RoomHold]? = nil,
        `heldMessages`: [String: [RoomHeldMessage]]? = nil,
        `queue`: [RoomQueueEntry]? = nil,
        `messages`: [WireMessage]? = nil,
        `hasMore`: Bool? = nil,
        `activeLeafId`: String? = nil
    ) {
        self.`usage` = `usage`
        self.`chiefAbsent` = `chiefAbsent`
        self.`memberContext` = `memberContext`
        self.`id` = `id`
        self.`threadId` = `threadId`
        self.`tasks` = `tasks`
        self.`name` = `name`
        self.`memberIds` = `memberIds`
        self.`defaultResponder` = `defaultResponder`
        self.`bulletin` = `bulletin`
        self.`description` = `description`
        self.`unread` = `unread`
        self.`lastReadMessageId` = `lastReadMessageId`
        self.`createdAt` = `createdAt`
        self.`dm` = `dm`
        self.`busyBotId` = `busyBotId`
        self.`turnStartedAt` = `turnStartedAt`
        self.`cwd` = `cwd`
        self.`pinnedCwd` = `pinnedCwd`
        self.`pinnedMessageId` = `pinnedMessageId`
        self.`section` = `section`
        self.`setupCompletedAt` = `setupCompletedAt`
        self.`setupSkippedAt` = `setupSkippedAt`
        self.`audienceFloor` = `audienceFloor`
        self.`working` = `working`
        self.`turnTimeoutMinutes` = `turnTimeoutMinutes`
        self.`holds` = `holds`
        self.`heldMessages` = `heldMessages`
        self.`queue` = `queue`
        self.`messages` = `messages`
        self.`hasMore` = `hasMore`
        self.`activeLeafId` = `activeLeafId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `usage` = try object.optional("usage")
        `chiefAbsent` = try object.optional("chiefAbsent")
        `memberContext` = try object.optional("memberContext")
        `id` = try object.required("id")
        `threadId` = try object.required("threadId")
        `tasks` = try object.optional("tasks")
        `name` = try object.required("name")
        `memberIds` = try object.required("memberIds")
        `defaultResponder` = try object.required("defaultResponder")
        `bulletin` = try object.required("bulletin")
        `description` = try object.optional("description")
        `unread` = try object.required("unread")
        `lastReadMessageId` = try object.optional("lastReadMessageId")
        `createdAt` = try object.required("createdAt")
        `dm` = try object.optional("dm")
        `busyBotId` = try object.optional("busyBotId")
        `turnStartedAt` = try object.optional("turnStartedAt")
        `cwd` = try object.optional("cwd")
        `pinnedCwd` = try object.optional("pinnedCwd")
        `pinnedMessageId` = try object.optional("pinnedMessageId")
        `section` = try object.optional("section")
        `setupCompletedAt` = try object.optional("setupCompletedAt")
        `setupSkippedAt` = try object.optional("setupSkippedAt")
        `audienceFloor` = try object.optional("audienceFloor")
        `working` = try object.required("working")
        `turnTimeoutMinutes` = try object.optional("turnTimeoutMinutes")
        `holds` = try object.optional("holds")
        `heldMessages` = try object.optional("heldMessages")
        `queue` = try object.optional("queue")
        `messages` = try object.optional("messages")
        `hasMore` = try object.optional("hasMore")
        `activeLeafId` = try object.optional("activeLeafId")
        additionalFields = object.remainder(excluding: ["usage", "chiefAbsent", "memberContext", "id", "threadId", "tasks", "name", "memberIds", "defaultResponder", "bulletin", "description", "unread", "lastReadMessageId", "createdAt", "dm", "busyBotId", "turnStartedAt", "cwd", "pinnedCwd", "pinnedMessageId", "section", "setupCompletedAt", "setupSkippedAt", "audienceFloor", "working", "turnTimeoutMinutes", "holds", "heldMessages", "queue", "messages", "hasMore", "activeLeafId"])
        explicitNulls = object.nullKeys.intersection(["usage", "chiefAbsent", "memberContext", "id", "threadId", "tasks", "name", "memberIds", "defaultResponder", "bulletin", "description", "unread", "lastReadMessageId", "createdAt", "dm", "busyBotId", "turnStartedAt", "cwd", "pinnedCwd", "pinnedMessageId", "section", "setupCompletedAt", "setupSkippedAt", "audienceFloor", "working", "turnTimeoutMinutes", "holds", "heldMessages", "queue", "messages", "hasMore", "activeLeafId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("usage", `usage`, nulls: explicitNulls)
        try object.putOptional("chiefAbsent", `chiefAbsent`, nulls: explicitNulls)
        try object.putOptional("memberContext", `memberContext`, nulls: explicitNulls)
        try object.put("id", `id`)
        try object.put("threadId", `threadId`)
        try object.putOptional("tasks", `tasks`, nulls: explicitNulls)
        try object.put("name", `name`)
        try object.put("memberIds", `memberIds`)
        try object.put("defaultResponder", `defaultResponder`)
        try object.put("bulletin", `bulletin`)
        try object.putOptional("description", `description`, nulls: explicitNulls)
        try object.put("unread", `unread`)
        try object.putOptional("lastReadMessageId", `lastReadMessageId`, nulls: explicitNulls)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("dm", `dm`, nulls: explicitNulls)
        try object.putOptional("busyBotId", `busyBotId`, nulls: explicitNulls)
        try object.putOptional("turnStartedAt", `turnStartedAt`, nulls: explicitNulls)
        try object.putOptional("cwd", `cwd`, nulls: explicitNulls)
        try object.putOptional("pinnedCwd", `pinnedCwd`, nulls: explicitNulls)
        try object.putOptional("pinnedMessageId", `pinnedMessageId`, nulls: explicitNulls)
        try object.putOptional("section", `section`, nulls: explicitNulls)
        try object.putOptional("setupCompletedAt", `setupCompletedAt`, nulls: explicitNulls)
        try object.putOptional("setupSkippedAt", `setupSkippedAt`, nulls: explicitNulls)
        try object.putOptional("audienceFloor", `audienceFloor`, nulls: explicitNulls)
        try object.put("working", `working`)
        try object.putOptional("turnTimeoutMinutes", `turnTimeoutMinutes`, nulls: explicitNulls)
        try object.putOptional("holds", `holds`, nulls: explicitNulls)
        try object.putOptional("heldMessages", `heldMessages`, nulls: explicitNulls)
        try object.putOptional("queue", `queue`, nulls: explicitNulls)
        try object.putOptional("messages", `messages`, nulls: explicitNulls)
        try object.putOptional("hasMore", `hasMore`, nulls: explicitNulls)
        try object.putOptional("activeLeafId", `activeLeafId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct GroupThreadUsage: WireModel {
    public var `input`: Double
    public var `output`: Double
    public var `cachedInput`: Double?
    public var `costUsd`: Double?
    public var `turns`: Double
    public var `lastTurn`: GroupThreadUsageLastTurn?
    public var `context`: GroupThreadUsageContext?
    public var `lastSpeaker`: GroupThreadUsageLastSpeaker?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `input`: Double,
        `output`: Double,
        `costUsd`: Double?,
        `turns`: Double,
        `cachedInput`: Double? = nil,
        `lastTurn`: GroupThreadUsageLastTurn? = nil,
        `context`: GroupThreadUsageContext? = nil,
        `lastSpeaker`: GroupThreadUsageLastSpeaker? = nil
    ) {
        self.`input` = `input`
        self.`output` = `output`
        self.`cachedInput` = `cachedInput`
        self.`costUsd` = `costUsd`
        self.`turns` = `turns`
        self.`lastTurn` = `lastTurn`
        self.`context` = `context`
        self.`lastSpeaker` = `lastSpeaker`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `input` = try object.required("input")
        `output` = try object.required("output")
        `cachedInput` = try object.optional("cachedInput")
        `costUsd` = try object.nullable("costUsd")
        `turns` = try object.required("turns")
        `lastTurn` = try object.optional("lastTurn")
        `context` = try object.optional("context")
        `lastSpeaker` = try object.optional("lastSpeaker")
        additionalFields = object.remainder(excluding: ["input", "output", "cachedInput", "costUsd", "turns", "lastTurn", "context", "lastSpeaker"])
        explicitNulls = object.nullKeys.intersection(["input", "output", "cachedInput", "costUsd", "turns", "lastTurn", "context", "lastSpeaker"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("input", `input`)
        try object.put("output", `output`)
        try object.putOptional("cachedInput", `cachedInput`, nulls: explicitNulls)
        try object.putNullable("costUsd", `costUsd`)
        try object.put("turns", `turns`)
        try object.putOptional("lastTurn", `lastTurn`, nulls: explicitNulls)
        try object.putOptional("context", `context`, nulls: explicitNulls)
        try object.putOptional("lastSpeaker", `lastSpeaker`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct GroupThreadUsageLastTurn: WireModel {
    public var `input`: Double
    public var `output`: Double
    public var `cachedInput`: Double?
    public var `costUsd`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`input`: Double, `output`: Double, `costUsd`: Double?, `cachedInput`: Double? = nil) {
        self.`input` = `input`
        self.`output` = `output`
        self.`cachedInput` = `cachedInput`
        self.`costUsd` = `costUsd`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `input` = try object.required("input")
        `output` = try object.required("output")
        `cachedInput` = try object.optional("cachedInput")
        `costUsd` = try object.nullable("costUsd")
        additionalFields = object.remainder(excluding: ["input", "output", "cachedInput", "costUsd"])
        explicitNulls = object.nullKeys.intersection(["input", "output", "cachedInput", "costUsd"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("input", `input`)
        try object.put("output", `output`)
        try object.putOptional("cachedInput", `cachedInput`, nulls: explicitNulls)
        try object.putNullable("costUsd", `costUsd`)
        try object.encode(to: encoder)
    }
}

public struct GroupThreadUsageContext: WireModel {
    public var `tokens`: Double
    public var `window`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`tokens`: Double, `window`: Double? = nil) {
        self.`tokens` = `tokens`
        self.`window` = `window`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `tokens` = try object.required("tokens")
        `window` = try object.optional("window")
        additionalFields = object.remainder(excluding: ["tokens", "window"])
        explicitNulls = object.nullKeys.intersection(["tokens", "window"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("tokens", `tokens`)
        try object.putOptional("window", `window`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct GroupThreadUsageLastSpeaker: WireModel {
    public var `botId`: String
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `name`: String) {
        self.`botId` = `botId`
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["botId", "name"])
        explicitNulls = object.nullKeys.intersection(["botId", "name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public struct WireGroupChiefAbsent: WireModel {
    public var `botId`: String
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `name`: String) {
        self.`botId` = `botId`
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["botId", "name"])
        explicitNulls = object.nullKeys.intersection(["botId", "name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public struct WireGroupMemberContextValue: WireModel {
    public var `tokens`: Double
    public var `window`: Double
    public var `compactRequested`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`tokens`: Double, `window`: Double, `compactRequested`: Bool? = nil) {
        self.`tokens` = `tokens`
        self.`window` = `window`
        self.`compactRequested` = `compactRequested`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `tokens` = try object.required("tokens")
        `window` = try object.required("window")
        `compactRequested` = try object.optional("compactRequested")
        additionalFields = object.remainder(excluding: ["tokens", "window", "compactRequested"])
        explicitNulls = object.nullKeys.intersection(["tokens", "window", "compactRequested"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("tokens", `tokens`)
        try object.put("window", `window`)
        try object.putOptional("compactRequested", `compactRequested`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct GroupTask: WireModel {
    public var `threadId`: String
    public var `title`: String
    public var `createdAt`: Double
    public var `pinnedCwd`: String?
    public var `pinnedMessageId`: String?
    public var `pinned`: Bool?
    public var `turnTimeoutMinutes`: Double?
    public var `archivedAt`: Double?
    public var `activity`: String?
    public var `updatedAt`: Double?
    public var `lastThreadOrderAt`: Double?
    public var `titleFromFirstMessage`: Bool?
    public var `working`: Bool?
    public var `busyBotId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `threadId`: String,
        `title`: String,
        `createdAt`: Double,
        `pinnedCwd`: String? = nil,
        `pinnedMessageId`: String? = nil,
        `pinned`: Bool? = nil,
        `turnTimeoutMinutes`: Double? = nil,
        `archivedAt`: Double? = nil,
        `activity`: String? = nil,
        `updatedAt`: Double? = nil,
        `lastThreadOrderAt`: Double? = nil,
        `titleFromFirstMessage`: Bool? = nil,
        `working`: Bool? = nil,
        `busyBotId`: String? = nil
    ) {
        self.`threadId` = `threadId`
        self.`title` = `title`
        self.`createdAt` = `createdAt`
        self.`pinnedCwd` = `pinnedCwd`
        self.`pinnedMessageId` = `pinnedMessageId`
        self.`pinned` = `pinned`
        self.`turnTimeoutMinutes` = `turnTimeoutMinutes`
        self.`archivedAt` = `archivedAt`
        self.`activity` = `activity`
        self.`updatedAt` = `updatedAt`
        self.`lastThreadOrderAt` = `lastThreadOrderAt`
        self.`titleFromFirstMessage` = `titleFromFirstMessage`
        self.`working` = `working`
        self.`busyBotId` = `busyBotId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `threadId` = try object.required("threadId")
        `title` = try object.required("title")
        `createdAt` = try object.required("createdAt")
        `pinnedCwd` = try object.optional("pinnedCwd")
        `pinnedMessageId` = try object.optional("pinnedMessageId")
        `pinned` = try object.optional("pinned")
        `turnTimeoutMinutes` = try object.optional("turnTimeoutMinutes")
        `archivedAt` = try object.optional("archivedAt")
        `activity` = try object.optional("activity")
        `updatedAt` = try object.optional("updatedAt")
        `lastThreadOrderAt` = try object.optional("lastThreadOrderAt")
        `titleFromFirstMessage` = try object.optional("titleFromFirstMessage")
        `working` = try object.optional("working")
        `busyBotId` = try object.optional("busyBotId")
        additionalFields = object.remainder(excluding: ["threadId", "title", "createdAt", "pinnedCwd", "pinnedMessageId", "pinned", "turnTimeoutMinutes", "archivedAt", "activity", "updatedAt", "lastThreadOrderAt", "titleFromFirstMessage", "working", "busyBotId"])
        explicitNulls = object.nullKeys.intersection(["threadId", "title", "createdAt", "pinnedCwd", "pinnedMessageId", "pinned", "turnTimeoutMinutes", "archivedAt", "activity", "updatedAt", "lastThreadOrderAt", "titleFromFirstMessage", "working", "busyBotId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("threadId", `threadId`)
        try object.put("title", `title`)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("pinnedCwd", `pinnedCwd`, nulls: explicitNulls)
        try object.putOptional("pinnedMessageId", `pinnedMessageId`, nulls: explicitNulls)
        try object.putOptional("pinned", `pinned`, nulls: explicitNulls)
        try object.putOptional("turnTimeoutMinutes", `turnTimeoutMinutes`, nulls: explicitNulls)
        try object.putOptional("archivedAt", `archivedAt`, nulls: explicitNulls)
        try object.putOptional("activity", `activity`, nulls: explicitNulls)
        try object.putOptional("updatedAt", `updatedAt`, nulls: explicitNulls)
        try object.putOptional("lastThreadOrderAt", `lastThreadOrderAt`, nulls: explicitNulls)
        try object.putOptional("titleFromFirstMessage", `titleFromFirstMessage`, nulls: explicitNulls)
        try object.putOptional("working", `working`, nulls: explicitNulls)
        try object.putOptional("busyBotId", `busyBotId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct GroupDefaultResponderMember: WireModel {
    public var `botId`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String) {
        self.`botId` = `botId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        additionalFields = object.remainder(excluding: ["botId"])
        explicitNulls = object.nullKeys.intersection(["botId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.encode(to: encoder)
    }
}

public struct GroupDefaultResponderEveryone: WireModel {

    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init() {

    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)

        additionalFields = object.remainder(excluding: [])
        explicitNulls = object.nullKeys.intersection([])
    }

    public func encode(to encoder: Encoder) throws {
        let object = WireObject(additionalFields)

        try object.encode(to: encoder)
    }
}

public struct GroupDefaultResponderMentions: WireModel {

    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init() {

    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)

        additionalFields = object.remainder(excluding: [])
        explicitNulls = object.nullKeys.intersection([])
    }

    public func encode(to encoder: Encoder) throws {
        let object = WireObject(additionalFields)

        try object.encode(to: encoder)
    }
}

public struct GroupDefaultResponderAuto: WireModel {
    public var `fallbackBotId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`fallbackBotId`: String? = nil) {
        self.`fallbackBotId` = `fallbackBotId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `fallbackBotId` = try object.optional("fallbackBotId")
        additionalFields = object.remainder(excluding: ["fallbackBotId"])
        explicitNulls = object.nullKeys.intersection(["fallbackBotId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("fallbackBotId", `fallbackBotId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public indirect enum GroupDefaultResponder: WireModel {
    case `member`(GroupDefaultResponderMember)
    case `everyone`(GroupDefaultResponderEveryone)
    case `mentions`(GroupDefaultResponderMentions)
    case `auto`(GroupDefaultResponderAuto)
    case unknown(kind: String, raw: JSONValue)

    public var kind: String {
        switch self {
        case .`member`: return "member"
        case .`everyone`: return "everyone"
        case .`mentions`: return "mentions"
        case .`auto`: return "auto"
        case .unknown(let kind, _): return kind
        }
    }
    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        guard let kind = raw["kind"]?.stringValue else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Missing kind"))
        }
        var payload = raw
        payload["kind"] = nil
        switch kind {
        case "member": self = .`member`(try payload.decode(GroupDefaultResponderMember.self))
        case "everyone": self = .`everyone`(try payload.decode(GroupDefaultResponderEveryone.self))
        case "mentions": self = .`mentions`(try payload.decode(GroupDefaultResponderMentions.self))
        case "auto": self = .`auto`(try payload.decode(GroupDefaultResponderAuto.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .`member`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`everyone`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`mentions`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`auto`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .unknown(_, let value): try value.encode(to: encoder)
        }
    }
}

public struct RoomHold: WireModel {
    public var `at`: Double
    public var `noted`: Bool?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`at`: Double, `noted`: Bool? = nil) {
        self.`at` = `at`
        self.`noted` = `noted`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `at` = try object.required("at")
        `noted` = try object.optional("noted")
        additionalFields = object.remainder(excluding: ["at", "noted"])
        explicitNulls = object.nullKeys.intersection(["at", "noted"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("at", `at`)
        try object.putOptional("noted", `noted`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct RoomHeldMessage: WireModel {
    public var `threadId`: String
    public var `messageId`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`threadId`: String, `messageId`: String) {
        self.`threadId` = `threadId`
        self.`messageId` = `messageId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `threadId` = try object.required("threadId")
        `messageId` = try object.required("messageId")
        additionalFields = object.remainder(excluding: ["threadId", "messageId"])
        explicitNulls = object.nullKeys.intersection(["threadId", "messageId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("threadId", `threadId`)
        try object.put("messageId", `messageId`)
        try object.encode(to: encoder)
    }
}

public struct RoomQueueEntry: WireModel {
    public var `botId`: String
    public var `threadId`: String
    public var `state`: RoomQueueEntryState
    public var `position`: Double
    public var `of`: Double
    public var `waitingForBotId`: String?
    public var `assignmentId`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `botId`: String,
        `threadId`: String,
        `state`: RoomQueueEntryState,
        `position`: Double,
        `of`: Double,
        `waitingForBotId`: String? = nil,
        `assignmentId`: String? = nil
    ) {
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`state` = `state`
        self.`position` = `position`
        self.`of` = `of`
        self.`waitingForBotId` = `waitingForBotId`
        self.`assignmentId` = `assignmentId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `state` = try object.required("state")
        `position` = try object.required("position")
        `of` = try object.required("of")
        `waitingForBotId` = try object.optional("waitingForBotId")
        `assignmentId` = try object.optional("assignmentId")
        additionalFields = object.remainder(excluding: ["botId", "threadId", "state", "position", "of", "waitingForBotId", "assignmentId"])
        explicitNulls = object.nullKeys.intersection(["botId", "threadId", "state", "position", "of", "waitingForBotId", "assignmentId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("state", `state`)
        try object.put("position", `position`)
        try object.put("of", `of`)
        try object.putOptional("waitingForBotId", `waitingForBotId`, nulls: explicitNulls)
        try object.putOptional("assignmentId", `assignmentId`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum RoomQueueEntryState: WireModel, Hashable, Sendable {
    case `running`
    case `queued`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "running": self = .`running`
        case "queued": self = .`queued`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`running`: return "running"
        case .`queued`: return "queued"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ServerFrameSections: WireModel {
    public var `sections`: [String]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`sections`: [String]) {
        self.`sections` = `sections`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `sections` = try object.required("sections")
        additionalFields = object.remainder(excluding: ["sections"])
        explicitNulls = object.nullKeys.intersection(["sections"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("sections", `sections`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameBotQueued: WireModel {
    public var `queues`: BotQueuedMessages
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`queues`: BotQueuedMessages) {
        self.`queues` = `queues`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `queues` = try object.required("queues")
        additionalFields = object.remainder(excluding: ["queues"])
        explicitNulls = object.nullKeys.intersection(["queues"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("queues", `queues`)
        try object.encode(to: encoder)
    }
}

public struct BotQueuedMessagesValueValueElement: WireModel {
    public var `queueId`: String
    public var `text`: String
    public var `reason`: SteerQueueReason?
    public var `why`: String?
    public var `sender`: ResolvedSender?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `queueId`: String,
        `text`: String,
        `reason`: SteerQueueReason? = nil,
        `why`: String? = nil,
        `sender`: ResolvedSender? = nil
    ) {
        self.`queueId` = `queueId`
        self.`text` = `text`
        self.`reason` = `reason`
        self.`why` = `why`
        self.`sender` = `sender`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `queueId` = try object.required("queueId")
        `text` = try object.required("text")
        `reason` = try object.optional("reason")
        `why` = try object.optional("why")
        `sender` = try object.optional("sender")
        additionalFields = object.remainder(excluding: ["queueId", "text", "reason", "why", "sender"])
        explicitNulls = object.nullKeys.intersection(["queueId", "text", "reason", "why", "sender"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("queueId", `queueId`)
        try object.put("text", `text`)
        try object.putOptional("reason", `reason`, nulls: explicitNulls)
        try object.putOptional("why", `why`, nulls: explicitNulls)
        try object.putOptional("sender", `sender`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum SteerQueueReason: WireModel, Hashable, Sendable {
    case `capacity`
    case `groupTurn`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "capacity": self = .`capacity`
        case "group-turn": self = .`groupTurn`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`capacity`: return "capacity"
        case .`groupTurn`: return "group-turn"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public typealias BotQueuedMessages = [String: [BotQueuedMessagesValueValueElement]]

public struct ServerFrameMessage: WireModel {
    public var `threadId`: String
    public var `message`: WireMessage
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`threadId`: String, `message`: WireMessage) {
        self.`threadId` = `threadId`
        self.`message` = `message`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `threadId` = try object.required("threadId")
        `message` = try object.required("message")
        additionalFields = object.remainder(excluding: ["threadId", "message"])
        explicitNulls = object.nullKeys.intersection(["threadId", "message"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("threadId", `threadId`)
        try object.put("message", `message`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameMessagePatch: WireModel {
    public var `threadId`: String
    public var `message`: WireMessage
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`threadId`: String, `message`: WireMessage) {
        self.`threadId` = `threadId`
        self.`message` = `message`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `threadId` = try object.required("threadId")
        `message` = try object.required("message")
        additionalFields = object.remainder(excluding: ["threadId", "message"])
        explicitNulls = object.nullKeys.intersection(["threadId", "message"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("threadId", `threadId`)
        try object.put("message", `message`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameThread: WireModel {
    public var `threadId`: String
    public var `activeLeafId`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`threadId`: String, `activeLeafId`: String) {
        self.`threadId` = `threadId`
        self.`activeLeafId` = `activeLeafId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `threadId` = try object.required("threadId")
        `activeLeafId` = try object.required("activeLeafId")
        additionalFields = object.remainder(excluding: ["threadId", "activeLeafId"])
        explicitNulls = object.nullKeys.intersection(["threadId", "activeLeafId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("threadId", `threadId`)
        try object.put("activeLeafId", `activeLeafId`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameBot: WireModel {
    public var `bot`: WireBot
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`bot`: WireBot) {
        self.`bot` = `bot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `bot` = try object.required("bot")
        additionalFields = object.remainder(excluding: ["bot"])
        explicitNulls = object.nullKeys.intersection(["bot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("bot", `bot`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameGroup: WireModel {
    public var `group`: WireGroup
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`group`: WireGroup) {
        self.`group` = `group`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `group` = try object.required("group")
        additionalFields = object.remainder(excluding: ["group"])
        explicitNulls = object.nullKeys.intersection(["group"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("group", `group`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameNotify: WireModel {
    public var `notification`: NotificationLogEntry
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`notification`: NotificationLogEntry) {
        self.`notification` = `notification`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `notification` = try object.required("notification")
        additionalFields = object.remainder(excluding: ["notification"])
        explicitNulls = object.nullKeys.intersection(["notification"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("notification", `notification`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameNotificationsRead: WireModel {
    public var `threadId`: String
    public var `ids`: [String]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`threadId`: String, `ids`: [String]) {
        self.`threadId` = `threadId`
        self.`ids` = `ids`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `threadId` = try object.required("threadId")
        `ids` = try object.required("ids")
        additionalFields = object.remainder(excluding: ["threadId", "ids"])
        explicitNulls = object.nullKeys.intersection(["threadId", "ids"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("threadId", `threadId`)
        try object.put("ids", `ids`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameGroupDeleted: WireModel {
    public var `groupId`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`groupId`: String) {
        self.`groupId` = `groupId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `groupId` = try object.required("groupId")
        additionalFields = object.remainder(excluding: ["groupId"])
        explicitNulls = object.nullKeys.intersection(["groupId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("groupId", `groupId`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameRoutine: WireModel {
    public var `routine`: Routine
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`routine`: Routine) {
        self.`routine` = `routine`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `routine` = try object.required("routine")
        additionalFields = object.remainder(excluding: ["routine"])
        explicitNulls = object.nullKeys.intersection(["routine"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("routine", `routine`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameRoutineDeleted: WireModel {
    public var `routineId`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`routineId`: String) {
        self.`routineId` = `routineId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `routineId` = try object.required("routineId")
        additionalFields = object.remainder(excluding: ["routineId"])
        explicitNulls = object.nullKeys.intersection(["routineId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("routineId", `routineId`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameRoutineRun: WireModel {
    public var `run`: RoutineRun
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`run`: RoutineRun) {
        self.`run` = `run`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `run` = try object.required("run")
        additionalFields = object.remainder(excluding: ["run"])
        explicitNulls = object.nullKeys.intersection(["run"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("run", `run`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameWebhook: WireModel {
    public var `webhook`: WebhookTrigger
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`webhook`: WebhookTrigger) {
        self.`webhook` = `webhook`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `webhook` = try object.required("webhook")
        additionalFields = object.remainder(excluding: ["webhook"])
        explicitNulls = object.nullKeys.intersection(["webhook"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("webhook", `webhook`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameWebhookAttempt: WireModel {
    public var `attempt`: WebhookAttempt
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`attempt`: WebhookAttempt) {
        self.`attempt` = `attempt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `attempt` = try object.required("attempt")
        additionalFields = object.remainder(excluding: ["attempt"])
        explicitNulls = object.nullKeys.intersection(["attempt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("attempt", `attempt`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameWebhookDeleted: WireModel {
    public var `webhookId`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`webhookId`: String) {
        self.`webhookId` = `webhookId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `webhookId` = try object.required("webhookId")
        additionalFields = object.remainder(excluding: ["webhookId"])
        explicitNulls = object.nullKeys.intersection(["webhookId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("webhookId", `webhookId`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameAppTrigger: WireModel {
    public var `botId`: String
    public var `trigger`: AppTrigger
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `trigger`: AppTrigger) {
        self.`botId` = `botId`
        self.`trigger` = `trigger`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `trigger` = try object.required("trigger")
        additionalFields = object.remainder(excluding: ["botId", "trigger"])
        explicitNulls = object.nullKeys.intersection(["botId", "trigger"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("trigger", `trigger`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameAppTriggerAttempt: WireModel {
    public var `botId`: String
    public var `attempt`: AppEventAttempt
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `attempt`: AppEventAttempt) {
        self.`botId` = `botId`
        self.`attempt` = `attempt`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `attempt` = try object.required("attempt")
        additionalFields = object.remainder(excluding: ["botId", "attempt"])
        explicitNulls = object.nullKeys.intersection(["botId", "attempt"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("attempt", `attempt`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameAppTriggerDeleted: WireModel {
    public var `triggerId`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`triggerId`: String) {
        self.`triggerId` = `triggerId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `triggerId` = try object.required("triggerId")
        additionalFields = object.remainder(excluding: ["triggerId"])
        explicitNulls = object.nullKeys.intersection(["triggerId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("triggerId", `triggerId`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameAppTriggerService: WireModel {
    public var `service`: AppTriggerService
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`service`: AppTriggerService) {
        self.`service` = `service`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `service` = try object.required("service")
        additionalFields = object.remainder(excluding: ["service"])
        explicitNulls = object.nullKeys.intersection(["service"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("service", `service`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameRuntime: WireModel {
    public var `event`: RuntimeEvent
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`event`: RuntimeEvent) {
        self.`event` = `event`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `event` = try object.required("event")
        additionalFields = object.remainder(excluding: ["event"])
        explicitNulls = object.nullKeys.intersection(["event"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("event", `event`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameMcpChanged: WireModel {

    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init() {

    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)

        additionalFields = object.remainder(excluding: [])
        explicitNulls = object.nullKeys.intersection([])
    }

    public func encode(to encoder: Encoder) throws {
        let object = WireObject(additionalFields)

        try object.encode(to: encoder)
    }
}

public struct ServerFrameScreen: WireModel {
    public var `botId`: String
    public var `threadId`: String
    public var `png`: String
    public var `mime`: String?
    public var `surface`: ServerFrameScreenSurface?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `botId`: String,
        `threadId`: String,
        `png`: String,
        `mime`: String? = nil,
        `surface`: ServerFrameScreenSurface? = nil
    ) {
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`png` = `png`
        self.`mime` = `mime`
        self.`surface` = `surface`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `png` = try object.required("png")
        `mime` = try object.optional("mime")
        `surface` = try object.optional("surface")
        additionalFields = object.remainder(excluding: ["botId", "threadId", "png", "mime", "surface"])
        explicitNulls = object.nullKeys.intersection(["botId", "threadId", "png", "mime", "surface"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("png", `png`)
        try object.putOptional("mime", `mime`, nulls: explicitNulls)
        try object.putOptional("surface", `surface`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum ServerFrameScreenSurface: WireModel, Hashable, Sendable {
    case `browser`
    case `computer`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "browser": self = .`browser`
        case "computer": self = .`computer`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`browser`: return "browser"
        case .`computer`: return "computer"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ServerFrameComputer: WireModel {
    public var `botId`: String
    public var `state`: ServerFrameComputerState
    public var `place`: String?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `state`: ServerFrameComputerState, `place`: String? = nil) {
        self.`botId` = `botId`
        self.`state` = `state`
        self.`place` = `place`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `state` = try object.required("state")
        `place` = try object.optional("place")
        additionalFields = object.remainder(excluding: ["botId", "state", "place"])
        explicitNulls = object.nullKeys.intersection(["botId", "state", "place"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("state", `state`)
        try object.putOptional("place", `place`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public enum ServerFrameComputerState: WireModel, Hashable, Sendable {
    case `provisioning`
    case `waking`
    case unknown(String)

    public init(rawValue: String) {
        switch rawValue {
        case "provisioning": self = .`provisioning`
        case "waking": self = .`waking`
        default: self = .unknown(rawValue)
        }
    }
    public var rawValue: String {
        switch self {
        case .`provisioning`: return "provisioning"
        case .`waking`: return "waking"
        case .unknown(let value): return value
        }
    }
    public init(from decoder: Decoder) throws { self.init(rawValue: try String(from: decoder)) }
    public func encode(to encoder: Encoder) throws { try rawValue.encode(to: encoder) }
}

public struct ServerFrameComputerControl: WireModel {
    public var `botId`: String
    public var `held`: Bool
    public var `helpReason`: String?
    public var `help`: ComputerHelpRef?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `held`: Bool, `helpReason`: String?, `help`: ComputerHelpRef? = nil) {
        self.`botId` = `botId`
        self.`held` = `held`
        self.`helpReason` = `helpReason`
        self.`help` = `help`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `held` = try object.required("held")
        `helpReason` = try object.nullable("helpReason")
        `help` = try object.optional("help")
        additionalFields = object.remainder(excluding: ["botId", "held", "helpReason", "help"])
        explicitNulls = object.nullKeys.intersection(["botId", "held", "helpReason", "help"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("held", `held`)
        try object.putNullable("helpReason", `helpReason`)
        try object.putOptional("help", `help`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct ComputerHelpRef: WireModel {
    public var `botId`: String
    public var `threadId`: String
    public var `messageId`: String
    public var `site`: String
    public var `place`: Surface
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `botId`: String,
        `threadId`: String,
        `messageId`: String,
        `site`: String,
        `place`: Surface
    ) {
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`messageId` = `messageId`
        self.`site` = `site`
        self.`place` = `place`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `messageId` = try object.required("messageId")
        `site` = try object.required("site")
        `place` = try object.required("place")
        additionalFields = object.remainder(excluding: ["botId", "threadId", "messageId", "site", "place"])
        explicitNulls = object.nullKeys.intersection(["botId", "threadId", "messageId", "site", "place"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.put("messageId", `messageId`)
        try object.put("site", `site`)
        try object.put("place", `place`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameData: WireModel {
    public var `botId`: String
    public var `sheet`: DataSheet
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `sheet`: DataSheet) {
        self.`botId` = `botId`
        self.`sheet` = `sheet`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `sheet` = try object.required("sheet")
        additionalFields = object.remainder(excluding: ["botId", "sheet"])
        explicitNulls = object.nullKeys.intersection(["botId", "sheet"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("sheet", `sheet`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameBotDeleted: WireModel {
    public var `botId`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String) {
        self.`botId` = `botId`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        additionalFields = object.remainder(excluding: ["botId"])
        explicitNulls = object.nullKeys.intersection(["botId"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameBotsOrder: WireModel {
    public var `botIds`: [String]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botIds`: [String]) {
        self.`botIds` = `botIds`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botIds` = try object.required("botIds")
        additionalFields = object.remainder(excluding: ["botIds"])
        explicitNulls = object.nullKeys.intersection(["botIds"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botIds", `botIds`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameGroupsOrder: WireModel {
    public var `groupIds`: [String]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`groupIds`: [String]) {
        self.`groupIds` = `groupIds`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `groupIds` = try object.required("groupIds")
        additionalFields = object.remainder(excluding: ["groupIds"])
        explicitNulls = object.nullKeys.intersection(["groupIds"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("groupIds", `groupIds`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameLiveCall: WireModel {
    public var `botId`: String
    public var `threadId`: String
    public var `call`: LiveCallState?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`botId`: String, `threadId`: String, `call`: LiveCallState?) {
        self.`botId` = `botId`
        self.`threadId` = `threadId`
        self.`call` = `call`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `botId` = try object.required("botId")
        `threadId` = try object.required("threadId")
        `call` = try object.nullable("call")
        additionalFields = object.remainder(excluding: ["botId", "threadId", "call"])
        explicitNulls = object.nullKeys.intersection(["botId", "threadId", "call"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("botId", `botId`)
        try object.put("threadId", `threadId`)
        try object.putNullable("call", `call`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameDeviceJob: WireModel {
    public var `phone`: String
    public var `id`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`phone`: String, `id`: String) {
        self.`phone` = `phone`
        self.`id` = `id`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `phone` = try object.required("phone")
        `id` = try object.required("id")
        additionalFields = object.remainder(excluding: ["phone", "id"])
        explicitNulls = object.nullKeys.intersection(["phone", "id"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("phone", `phone`)
        try object.put("id", `id`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameTeamPresence: WireModel {
    public var `email`: String
    public var `here`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`email`: String, `here`: Bool) {
        self.`email` = `email`
        self.`here` = `here`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `email` = try object.required("email")
        `here` = try object.required("here")
        additionalFields = object.remainder(excluding: ["email", "here"])
        explicitNulls = object.nullKeys.intersection(["email", "here"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("email", `email`)
        try object.put("here", `here`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameThreadPresence: WireModel {
    public var `threadId`: String
    public var `people`: [String]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`threadId`: String, `people`: [String]) {
        self.`threadId` = `threadId`
        self.`people` = `people`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `threadId` = try object.required("threadId")
        `people` = try object.required("people")
        additionalFields = object.remainder(excluding: ["threadId", "people"])
        explicitNulls = object.nullKeys.intersection(["threadId", "people"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("threadId", `threadId`)
        try object.put("people", `people`)
        try object.encode(to: encoder)
    }
}

public struct ServerFrameTeamPeople: WireModel {

    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init() {

    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)

        additionalFields = object.remainder(excluding: [])
        explicitNulls = object.nullKeys.intersection([])
    }

    public func encode(to encoder: Encoder) throws {
        let object = WireObject(additionalFields)

        try object.encode(to: encoder)
    }
}

public struct ServerFrameConfig: WireModel {

    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init() {

    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)

        additionalFields = object.remainder(excluding: [])
        explicitNulls = object.nullKeys.intersection([])
    }

    public func encode(to encoder: Encoder) throws {
        let object = WireObject(additionalFields)

        try object.encode(to: encoder)
    }
}

public struct ServerFrameHello: WireModel {
    public var `cursor`: String?
    public var `resumed`: Bool
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`resumed`: Bool, `cursor`: String? = nil) {
        self.`cursor` = `cursor`
        self.`resumed` = `resumed`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `cursor` = try object.optional("cursor")
        `resumed` = try object.required("resumed")
        additionalFields = object.remainder(excluding: ["cursor", "resumed"])
        explicitNulls = object.nullKeys.intersection(["cursor", "resumed"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.putOptional("cursor", `cursor`, nulls: explicitNulls)
        try object.put("resumed", `resumed`)
        try object.encode(to: encoder)
    }
}

public struct ServerFramePing: WireModel {

    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init() {

    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)

        additionalFields = object.remainder(excluding: [])
        explicitNulls = object.nullKeys.intersection([])
    }

    public func encode(to encoder: Encoder) throws {
        let object = WireObject(additionalFields)

        try object.encode(to: encoder)
    }
}

public struct ServerFrameSnapshot: WireModel {
    public var `snapshot`: BotsSnapshot
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`snapshot`: BotsSnapshot) {
        self.`snapshot` = `snapshot`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `snapshot` = try object.required("snapshot")
        additionalFields = object.remainder(excluding: ["snapshot"])
        explicitNulls = object.nullKeys.intersection(["snapshot"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("snapshot", `snapshot`)
        try object.encode(to: encoder)
    }
}

public indirect enum ServerFrame: WireModel {
    case `sections`(ServerFrameSections)
    case `botQueued`(ServerFrameBotQueued)
    case `message`(ServerFrameMessage)
    case `messagePatch`(ServerFrameMessagePatch)
    case `thread`(ServerFrameThread)
    case `bot`(ServerFrameBot)
    case `group`(ServerFrameGroup)
    case `notify`(ServerFrameNotify)
    case `notificationsRead`(ServerFrameNotificationsRead)
    case `groupDeleted`(ServerFrameGroupDeleted)
    case `routine`(ServerFrameRoutine)
    case `routineDeleted`(ServerFrameRoutineDeleted)
    case `routineRun`(ServerFrameRoutineRun)
    case `webhook`(ServerFrameWebhook)
    case `webhookAttempt`(ServerFrameWebhookAttempt)
    case `webhookDeleted`(ServerFrameWebhookDeleted)
    case `appTrigger`(ServerFrameAppTrigger)
    case `appTriggerAttempt`(ServerFrameAppTriggerAttempt)
    case `appTriggerDeleted`(ServerFrameAppTriggerDeleted)
    case `appTriggerService`(ServerFrameAppTriggerService)
    case `runtime`(ServerFrameRuntime)
    case `mcpChanged`(ServerFrameMcpChanged)
    case `screen`(ServerFrameScreen)
    case `computer`(ServerFrameComputer)
    case `computerControl`(ServerFrameComputerControl)
    case `data`(ServerFrameData)
    case `botDeleted`(ServerFrameBotDeleted)
    case `botsOrder`(ServerFrameBotsOrder)
    case `groupsOrder`(ServerFrameGroupsOrder)
    case `liveCall`(ServerFrameLiveCall)
    case `deviceJob`(ServerFrameDeviceJob)
    case `teamPresence`(ServerFrameTeamPresence)
    case `threadPresence`(ServerFrameThreadPresence)
    case `teamPeople`(ServerFrameTeamPeople)
    case `config`(ServerFrameConfig)
    case `hello`(ServerFrameHello)
    case `ping`(ServerFramePing)
    case `snapshot`(ServerFrameSnapshot)
    case unknown(kind: String, raw: JSONValue)

    public var kind: String {
        switch self {
        case .`sections`: return "sections"
        case .`botQueued`: return "bot.queued"
        case .`message`: return "message"
        case .`messagePatch`: return "message.patch"
        case .`thread`: return "thread"
        case .`bot`: return "bot"
        case .`group`: return "group"
        case .`notify`: return "notify"
        case .`notificationsRead`: return "notifications.read"
        case .`groupDeleted`: return "group.deleted"
        case .`routine`: return "routine"
        case .`routineDeleted`: return "routine.deleted"
        case .`routineRun`: return "routine.run"
        case .`webhook`: return "webhook"
        case .`webhookAttempt`: return "webhook.attempt"
        case .`webhookDeleted`: return "webhook.deleted"
        case .`appTrigger`: return "app-trigger"
        case .`appTriggerAttempt`: return "app-trigger.attempt"
        case .`appTriggerDeleted`: return "app-trigger.deleted"
        case .`appTriggerService`: return "app-trigger.service"
        case .`runtime`: return "runtime"
        case .`mcpChanged`: return "mcp.changed"
        case .`screen`: return "screen"
        case .`computer`: return "computer"
        case .`computerControl`: return "computer-control"
        case .`data`: return "data"
        case .`botDeleted`: return "bot.deleted"
        case .`botsOrder`: return "bots.order"
        case .`groupsOrder`: return "groups.order"
        case .`liveCall`: return "live.call"
        case .`deviceJob`: return "device.job"
        case .`teamPresence`: return "team.presence"
        case .`threadPresence`: return "thread.presence"
        case .`teamPeople`: return "team.people"
        case .`config`: return "config"
        case .`hello`: return "hello"
        case .`ping`: return "ping"
        case .`snapshot`: return "snapshot"
        case .unknown(let kind, _): return kind
        }
    }
    public init(from decoder: Decoder) throws {
        let raw = try JSONValue(from: decoder)
        guard let kind = raw["kind"]?.stringValue else {
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "Missing kind"))
        }
        var payload = raw
        payload["kind"] = nil
        switch kind {
        case "sections": self = .`sections`(try payload.decode(ServerFrameSections.self))
        case "bot.queued": self = .`botQueued`(try payload.decode(ServerFrameBotQueued.self))
        case "message": self = .`message`(try payload.decode(ServerFrameMessage.self))
        case "message.patch": self = .`messagePatch`(try payload.decode(ServerFrameMessagePatch.self))
        case "thread": self = .`thread`(try payload.decode(ServerFrameThread.self))
        case "bot": self = .`bot`(try payload.decode(ServerFrameBot.self))
        case "group": self = .`group`(try payload.decode(ServerFrameGroup.self))
        case "notify": self = .`notify`(try payload.decode(ServerFrameNotify.self))
        case "notifications.read": self = .`notificationsRead`(try payload.decode(ServerFrameNotificationsRead.self))
        case "group.deleted": self = .`groupDeleted`(try payload.decode(ServerFrameGroupDeleted.self))
        case "routine": self = .`routine`(try payload.decode(ServerFrameRoutine.self))
        case "routine.deleted": self = .`routineDeleted`(try payload.decode(ServerFrameRoutineDeleted.self))
        case "routine.run": self = .`routineRun`(try payload.decode(ServerFrameRoutineRun.self))
        case "webhook": self = .`webhook`(try payload.decode(ServerFrameWebhook.self))
        case "webhook.attempt": self = .`webhookAttempt`(try payload.decode(ServerFrameWebhookAttempt.self))
        case "webhook.deleted": self = .`webhookDeleted`(try payload.decode(ServerFrameWebhookDeleted.self))
        case "app-trigger": self = .`appTrigger`(try payload.decode(ServerFrameAppTrigger.self))
        case "app-trigger.attempt": self = .`appTriggerAttempt`(try payload.decode(ServerFrameAppTriggerAttempt.self))
        case "app-trigger.deleted": self = .`appTriggerDeleted`(try payload.decode(ServerFrameAppTriggerDeleted.self))
        case "app-trigger.service": self = .`appTriggerService`(try payload.decode(ServerFrameAppTriggerService.self))
        case "runtime": self = .`runtime`(try payload.decode(ServerFrameRuntime.self))
        case "mcp.changed": self = .`mcpChanged`(try payload.decode(ServerFrameMcpChanged.self))
        case "screen": self = .`screen`(try payload.decode(ServerFrameScreen.self))
        case "computer": self = .`computer`(try payload.decode(ServerFrameComputer.self))
        case "computer-control": self = .`computerControl`(try payload.decode(ServerFrameComputerControl.self))
        case "data": self = .`data`(try payload.decode(ServerFrameData.self))
        case "bot.deleted": self = .`botDeleted`(try payload.decode(ServerFrameBotDeleted.self))
        case "bots.order": self = .`botsOrder`(try payload.decode(ServerFrameBotsOrder.self))
        case "groups.order": self = .`groupsOrder`(try payload.decode(ServerFrameGroupsOrder.self))
        case "live.call": self = .`liveCall`(try payload.decode(ServerFrameLiveCall.self))
        case "device.job": self = .`deviceJob`(try payload.decode(ServerFrameDeviceJob.self))
        case "team.presence": self = .`teamPresence`(try payload.decode(ServerFrameTeamPresence.self))
        case "thread.presence": self = .`threadPresence`(try payload.decode(ServerFrameThreadPresence.self))
        case "team.people": self = .`teamPeople`(try payload.decode(ServerFrameTeamPeople.self))
        case "config": self = .`config`(try payload.decode(ServerFrameConfig.self))
        case "hello": self = .`hello`(try payload.decode(ServerFrameHello.self))
        case "ping": self = .`ping`(try payload.decode(ServerFramePing.self))
        case "snapshot": self = .`snapshot`(try payload.decode(ServerFrameSnapshot.self))
        default: self = .unknown(kind: kind, raw: raw)
        }
    }
    public func encode(to encoder: Encoder) throws {
        switch self {
        case .`sections`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`botQueued`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`message`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`messagePatch`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`thread`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`bot`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`group`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`notify`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`notificationsRead`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`groupDeleted`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`routine`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`routineDeleted`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`routineRun`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`webhook`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`webhookAttempt`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`webhookDeleted`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`appTrigger`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`appTriggerAttempt`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`appTriggerDeleted`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`appTriggerService`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`runtime`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`mcpChanged`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`screen`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`computer`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`computerControl`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`data`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`botDeleted`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`botsOrder`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`groupsOrder`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`liveCall`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`deviceJob`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`teamPresence`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`threadPresence`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`teamPeople`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`config`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`hello`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`ping`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .`snapshot`(let value): try encodeTaggedWirePayload(value, kind: kind, to: encoder)
        case .unknown(_, let value): try value.encode(to: encoder)
        }
    }
}

public struct OpenThreadCandidate: WireModel {
    public var `createdAt`: Double
    public var `routineRunId`: String?
    public var `openedBy`: TaskOpenedBy?
    public var `closedBy`: TaskClosedBy?
    public var `archivedAt`: Double?
    public var `pinned`: Bool?
    public var `lastThreadOrderAt`: Double?
    public var `snoozedUntil`: Double?
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `createdAt`: Double,
        `routineRunId`: String? = nil,
        `openedBy`: TaskOpenedBy? = nil,
        `closedBy`: TaskClosedBy? = nil,
        `archivedAt`: Double? = nil,
        `pinned`: Bool? = nil,
        `lastThreadOrderAt`: Double? = nil,
        `snoozedUntil`: Double? = nil
    ) {
        self.`createdAt` = `createdAt`
        self.`routineRunId` = `routineRunId`
        self.`openedBy` = `openedBy`
        self.`closedBy` = `closedBy`
        self.`archivedAt` = `archivedAt`
        self.`pinned` = `pinned`
        self.`lastThreadOrderAt` = `lastThreadOrderAt`
        self.`snoozedUntil` = `snoozedUntil`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `createdAt` = try object.required("createdAt")
        `routineRunId` = try object.optional("routineRunId")
        `openedBy` = try object.optional("openedBy")
        `closedBy` = try object.optional("closedBy")
        `archivedAt` = try object.optional("archivedAt")
        `pinned` = try object.optional("pinned")
        `lastThreadOrderAt` = try object.optional("lastThreadOrderAt")
        `snoozedUntil` = try object.optional("snoozedUntil")
        additionalFields = object.remainder(excluding: ["createdAt", "routineRunId", "openedBy", "closedBy", "archivedAt", "pinned", "lastThreadOrderAt", "snoozedUntil"])
        explicitNulls = object.nullKeys.intersection(["createdAt", "routineRunId", "openedBy", "closedBy", "archivedAt", "pinned", "lastThreadOrderAt", "snoozedUntil"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("createdAt", `createdAt`)
        try object.putOptional("routineRunId", `routineRunId`, nulls: explicitNulls)
        try object.putOptional("openedBy", `openedBy`, nulls: explicitNulls)
        try object.putOptional("closedBy", `closedBy`, nulls: explicitNulls)
        try object.putOptional("archivedAt", `archivedAt`, nulls: explicitNulls)
        try object.putOptional("pinned", `pinned`, nulls: explicitNulls)
        try object.putOptional("lastThreadOrderAt", `lastThreadOrderAt`, nulls: explicitNulls)
        try object.putOptional("snoozedUntil", `snoozedUntil`, nulls: explicitNulls)
        try object.encode(to: encoder)
    }
}

public struct SkillsLibrarySkillWire: WireModel {
    public var `name`: String
    public var `description`: String
    public var `source`: String
    public var `enabled`: Bool
    public var `everyBot`: Bool
    public var `tags`: [String]
    public var `version`: String?
    public var `importedAt`: String
    public var `license`: String?
    public var `compatibility`: String?
    public var `warnings`: [String]
    public var `assignedBots`: [SkillsLibrarySkillWireAssignedBotsElement]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(
        `name`: String,
        `description`: String,
        `source`: String,
        `enabled`: Bool,
        `everyBot`: Bool,
        `tags`: [String],
        `version`: String?,
        `importedAt`: String,
        `warnings`: [String],
        `assignedBots`: [SkillsLibrarySkillWireAssignedBotsElement],
        `license`: String? = nil,
        `compatibility`: String? = nil
    ) {
        self.`name` = `name`
        self.`description` = `description`
        self.`source` = `source`
        self.`enabled` = `enabled`
        self.`everyBot` = `everyBot`
        self.`tags` = `tags`
        self.`version` = `version`
        self.`importedAt` = `importedAt`
        self.`license` = `license`
        self.`compatibility` = `compatibility`
        self.`warnings` = `warnings`
        self.`assignedBots` = `assignedBots`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `name` = try object.required("name")
        `description` = try object.required("description")
        `source` = try object.required("source")
        `enabled` = try object.required("enabled")
        `everyBot` = try object.required("everyBot")
        `tags` = try object.required("tags")
        `version` = try object.nullable("version")
        `importedAt` = try object.required("importedAt")
        `license` = try object.optional("license")
        `compatibility` = try object.optional("compatibility")
        `warnings` = try object.required("warnings")
        `assignedBots` = try object.required("assignedBots")
        additionalFields = object.remainder(excluding: ["name", "description", "source", "enabled", "everyBot", "tags", "version", "importedAt", "license", "compatibility", "warnings", "assignedBots"])
        explicitNulls = object.nullKeys.intersection(["name", "description", "source", "enabled", "everyBot", "tags", "version", "importedAt", "license", "compatibility", "warnings", "assignedBots"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("name", `name`)
        try object.put("description", `description`)
        try object.put("source", `source`)
        try object.put("enabled", `enabled`)
        try object.put("everyBot", `everyBot`)
        try object.put("tags", `tags`)
        try object.putNullable("version", `version`)
        try object.put("importedAt", `importedAt`)
        try object.putOptional("license", `license`, nulls: explicitNulls)
        try object.putOptional("compatibility", `compatibility`, nulls: explicitNulls)
        try object.put("warnings", `warnings`)
        try object.put("assignedBots", `assignedBots`)
        try object.encode(to: encoder)
    }
}

public struct SkillsLibrarySkillWireAssignedBotsElement: WireModel {
    public var `id`: String
    public var `name`: String
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`id`: String, `name`: String) {
        self.`id` = `id`
        self.`name` = `name`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `id` = try object.required("id")
        `name` = try object.required("name")
        additionalFields = object.remainder(excluding: ["id", "name"])
        explicitNulls = object.nullKeys.intersection(["id", "name"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("id", `id`)
        try object.put("name", `name`)
        try object.encode(to: encoder)
    }
}

public struct BotAssignedSkillsWire: WireModel {
    public var `skills`: [String]
    public var additionalFields: [String: JSONValue] = [:]
    private var explicitNulls: Set<String> = []

    public init(`skills`: [String]) {
        self.`skills` = `skills`
    }

    public init(from decoder: Decoder) throws {
        let object = try WireObject(from: decoder)
        `skills` = try object.required("skills")
        additionalFields = object.remainder(excluding: ["skills"])
        explicitNulls = object.nullKeys.intersection(["skills"])
    }

    public func encode(to encoder: Encoder) throws {
        var object = WireObject(additionalFields)
        try object.put("skills", `skills`)
        try object.encode(to: encoder)
    }
}
