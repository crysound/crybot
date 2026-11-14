import Foundation

public typealias BotID = String
public typealias GroupID = String
public typealias ThreadID = String
public typealias MessageID = String
public typealias PhoneDeviceID = String
public typealias DataRow = [String: JSONValue]

/// First matching row wins. Applied and undone cards require autoApplied, answered == "allow", and no held reason.
///
/// | Priority | Field | Owner task |
/// | --- | --- | --- |
/// | 1 | questionRequest | 15 |
/// | 2 | commandAllowlist | 15 |
/// | 3 | fixedOptions | 15 |
/// | 4 | applied and undone | 15 |
/// | 5 | applied | 15 |
/// | 6–22 | routineRequest, webhookRequest, appTriggerRequest, profileRequest, modelRequest,
/// teamSetupRequest, mcpRequest, skillRequest, quotaSwitch, lendingLift, outboundRequest,
/// teamMemoryRequest, yourComputer, waitRequest, computerAsk, accessRequest, outsideWrite | 16 |
/// | 23 | permission / no specialized field | 15 |
public enum RequestCardKind: String, Codable, CaseIterable, Sendable {
    case questionRequest, commandAllowlist, fixedOptions, undone, autoApplied
    case routineRequest, webhookRequest, appTriggerRequest, profileRequest, modelRequest
    case teamSetupRequest, mcpRequest, skillRequest, quotaSwitch, lendingLift, outboundRequest
    case teamMemoryRequest, yourComputer, waitRequest, computerAsk, accessRequest, outsideWrite
    case permission

    public static func classify(_ card: OptionCardData) -> Self {
        if card.questionRequest != nil { return .questionRequest }
        if card.commandAllowlist != nil { return .commandAllowlist }
        if card.fixedOptions == true { return .fixedOptions }
        if card.autoApplied == true, card.answered == "allow", (card.held ?? "").isEmpty {
            return card.undone == true ? .undone : .autoApplied
        }
        if card.routineRequest != nil { return .routineRequest }
        if card.webhookRequest != nil { return .webhookRequest }
        if card.appTriggerRequest != nil { return .appTriggerRequest }
        if card.profileRequest != nil { return .profileRequest }
        if card.modelRequest != nil { return .modelRequest }
        if card.teamSetupRequest != nil { return .teamSetupRequest }
        if card.mcpRequest != nil { return .mcpRequest }
        if card.skillRequest != nil { return .skillRequest }
        if card.quotaSwitch != nil { return .quotaSwitch }
        if card.lendingLift != nil { return .lendingLift }
        if card.outboundRequest != nil { return .outboundRequest }
        if card.teamMemoryRequest != nil { return .teamMemoryRequest }
        if card.yourComputer != nil { return .yourComputer }
        if card.waitRequest != nil { return .waitRequest }
        if card.computerAsk != nil { return .computerAsk }
        if card.accessRequest != nil { return .accessRequest }
        if card.outsideWrite != nil { return .outsideWrite }
        return .permission
    }
}

extension APIError: Error {}
