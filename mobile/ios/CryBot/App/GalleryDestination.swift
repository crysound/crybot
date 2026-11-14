import SwiftUI

struct GalleryDestination: View {
    let name: String

    var body: some View {
        switch name {
        case "Login": LoginGallery()
        case "Avatar": AvatarGallery()
        case "Sidebar": SidebarGallery()
        case "Chat": ChatGallery()
        case "Composer": ComposerGallery()
        case "Activity": ActivityGallery()
        case "Markdown": MarkdownGallery()
        case "Code": CodeGallery()
        case "Math": MathGallery()
        case "Media": MediaGallery()
        case "CardsApproval": CardsApprovalGallery()
        case "CardsRequests": CardsRequestsGallery()
        case "CardsConnect": CardsConnectGallery()
        case "Records": RecordsGallery()
        case "MessageExtras": MessageExtrasGallery()
        case "Group": GroupGallery()
        case "Inbox": InboxGallery()
        case "Desktop": DesktopGallery()
        case "WebHost": WebHostGallery()
        default: EmptyState(title: name, systemImage: "rectangle.stack")
        }
    }
}
