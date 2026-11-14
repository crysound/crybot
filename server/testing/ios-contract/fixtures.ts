import type { WireMessage, OptionCardData, ServerFrame, WireBot, WireGroup } from "../../../shared/wire.ts";
import type { RuntimeEvent } from "../../../shared/runtime-events.ts";
import type { CryChartSpec } from "../../../shared/data-surface.ts";
import { parseWidgetInput, type WidgetNode } from "../../../shared/widget.ts";

export type ContractSample = { name: string; swiftType: string; value: unknown };

export const messages = [
  { name: "text", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message"
} satisfies WireMessage },
  { name: "options", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "options",
  "at": 1,
  "text": "Example message",
  "card": {
    "title": "Approve request",
    "subtitle": "Run example command",
    "options": [
      "Allow",
      "Deny"
    ]
  }
} satisfies WireMessage },
  { name: "activity", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "activity",
  "at": 1,
  "text": "Example message"
} satisfies WireMessage },
  { name: "screen", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "screen",
  "at": 1,
  "text": "Example message",
  "png": "cGxhY2Vob2xkZXI="
} satisfies WireMessage },
  { name: "connector", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "connector",
  "at": 1,
  "text": "Example message",
  "connector": {
    "slug": "Example",
    "label": "Example",
    "description": "Example",
    "status": "required",
    "resumeKey": "Example"
  }
} satisfies WireMessage },
  { name: "secret", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "secret",
  "at": 1,
  "text": "Example message",
  "secret": {
    "target": "xaiApiKey",
    "label": "Example",
    "description": "Example",
    "placeholder": "Example",
    "helpUrl": "https://cry.example.com",
    "requestKey": "Example"
  }
} satisfies WireMessage },
  { name: "signin", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "signin",
  "at": 1,
  "text": "Example message",
  "signIn": {
    "url": "https://cry.example.com",
    "site": "Example",
    "place": "cloud"
  }
} satisfies WireMessage },
  { name: "routine.run", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "routine.run",
  "at": 1,
  "text": "Example message",
  "routineRun": {
    "runId": "runId-example",
    "routineId": "routineId-example",
    "routineName": "Example",
    "status": "failed"
  }
} satisfies WireMessage },
  { name: "goal.run", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "goal.run",
  "at": 1,
  "text": "Example message",
  "goalRun": {
    "runId": "runId-example",
    "goal": "Example",
    "status": "failed",
    "coordinatorBotId": "coordinatorBotId-example",
    "coordinatorName": "Example",
    "turnCount": 1,
    "maxTurns": 1,
    "startedAt": 1
  }
} satisfies WireMessage },
  { name: "burst", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "burst",
  "at": 1,
  "text": "Example message",
  "burst": {
    "version": 1,
    "burstId": "burstId-example",
    "botId": "botId-example",
    "task": "Example",
    "phase": "preview",
    "total": 1,
    "requested": 1,
    "parallel": 1,
    "modelName": "Example",
    "estimateMinutes": 1,
    "counts": {
      "failed": 1,
      "queued": 1,
      "running": 1,
      "cancelled": 1,
      "done": 1
    },
    "sample": []
  }
} satisfies WireMessage },
  { name: "digest", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "digest",
  "at": 1,
  "text": "Example message",
  "digest": {
    "turnId": "turnId-example",
    "botId": "botId-example",
    "threadId": "threadId-example",
    "at": 1,
    "durationMs": 1,
    "tools": [],
    "memory": [],
    "reply": "Example",
    "hookCoverage": "full"
  }
} satisfies WireMessage },
  { name: "compaction", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "compaction",
  "at": 1,
  "text": "Example message",
  "compaction": {
    "summary": "Example",
    "firstKeptId": "firstKeptId-example",
    "foldedThroughId": "foldedThroughId-example",
    "tokensBefore": 1,
    "by": "person"
  }
} satisfies WireMessage },
  { name: "call", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "call",
  "at": 1,
  "text": "Example message",
  "call": {
    "callId": "callId-example",
    "botId": "botId-example",
    "client": "desktop",
    "startedAt": 1,
    "endedAt": 1,
    "seconds": 1,
    "endReason": "hung-up"
  }
} satisfies WireMessage },
  { name: "widget", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "widget",
  "at": 1,
  "text": "Example message",
  "widget": {
    "v": 1,
    "root": {
      "type": "Card",
      "id": "n1",
      "children": [
        {
          "type": "Text",
          "id": "n2",
          "value": "Example"
        }
      ]
    }
  }
} satisfies WireMessage },
  { name: "app", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "app",
  "at": 1,
  "text": "Example message",
  "app": {
    "v": 1,
    "source": "html",
    "title": "Example",
    "doc": "Example",
    "rev": 1,
    "bytes": 1,
    "border": false,
    "network": {
      "connect": [],
      "resources": []
    }
  }
} satisfies WireMessage },
  { name: "field-roomRequest", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "roomRequest": {
    "id": "id-example",
    "phase": "request"
  }
} satisfies WireMessage },
  { name: "field-digest", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "digest",
  "at": 1,
  "text": "Example message",
  "digest": {
    "turnId": "turnId-example",
    "botId": "botId-example",
    "threadId": "threadId-example",
    "at": 1,
    "durationMs": 1,
    "tools": [],
    "memory": [],
    "reply": "Example",
    "hookCoverage": "full"
  }
} satisfies WireMessage },
  { name: "field-engineCompaction", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "engineCompaction": true
} satisfies WireMessage },
  { name: "field-compaction", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "compaction",
  "at": 1,
  "text": "Example message",
  "compaction": {
    "summary": "Example",
    "firstKeptId": "firstKeptId-example",
    "foldedThroughId": "foldedThroughId-example",
    "tokensBefore": 1,
    "by": "person"
  }
} satisfies WireMessage },
  { name: "field-attachments", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "attachments": [
    {
      "kind": "image",
      "path": "/api/attachments/example.png",
      "mime": "image/png"
    },
    {
      "kind": "file",
      "path": "/api/attachments/example.txt",
      "mime": "text/plain",
      "name": "example.txt"
    },
    {
      "kind": "audio",
      "path": "/api/attachments/example.wav",
      "mime": "audio/wav",
      "durationMs": 1000
    }
  ]
} satisfies WireMessage },
  { name: "field-card", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "options",
  "at": 1,
  "text": "Example message",
  "card": {
    "title": "Approve request",
    "subtitle": "Run example command",
    "options": [
      "Allow",
      "Deny"
    ]
  }
} satisfies WireMessage },
  { name: "field-widget", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "widget",
  "at": 1,
  "text": "Example message",
  "widget": {
    "v": 1,
    "root": {
      "type": "Card",
      "id": "n1",
      "children": [
        {
          "type": "Text",
          "id": "n2",
          "value": "Example"
        }
      ]
    }
  }
} satisfies WireMessage },
  { name: "field-serverCard", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "serverCard": true
} satisfies WireMessage },
  { name: "field-setupSuggestion", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "setupSuggestion": {
    "kind": "helperKey"
  }
} satisfies WireMessage },
  { name: "field-setupRequest", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "setupRequest": true
} satisfies WireMessage },
  { name: "field-app", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "app",
  "at": 1,
  "text": "Example message",
  "app": {
    "v": 1,
    "source": "html",
    "title": "Example",
    "doc": "Example",
    "rev": 1,
    "bytes": 1,
    "border": false,
    "network": {
      "connect": [],
      "resources": []
    }
  }
} satisfies WireMessage },
  { name: "field-fromApp", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "fromApp": {
    "messageId": "messageId-example",
    "title": "Example"
  }
} satisfies WireMessage },
  { name: "field-pointed", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "pointed": []
} satisfies WireMessage },
  { name: "field-connector", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "connector",
  "at": 1,
  "text": "Example message",
  "connector": {
    "slug": "Example",
    "label": "Example",
    "description": "Example",
    "status": "required",
    "resumeKey": "Example"
  }
} satisfies WireMessage },
  { name: "field-secret", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "secret",
  "at": 1,
  "text": "Example message",
  "secret": {
    "target": "xaiApiKey",
    "label": "Example",
    "description": "Example",
    "placeholder": "Example",
    "helpUrl": "https://cry.example.com",
    "requestKey": "Example"
  }
} satisfies WireMessage },
  { name: "field-signIn", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "signin",
  "at": 1,
  "text": "Example message",
  "signIn": {
    "url": "https://cry.example.com",
    "site": "Example",
    "place": "cloud"
  }
} satisfies WireMessage },
  { name: "field-routineRun", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "routine.run",
  "at": 1,
  "text": "Example message",
  "routineRun": {
    "runId": "runId-example",
    "routineId": "routineId-example",
    "routineName": "Example",
    "status": "failed"
  }
} satisfies WireMessage },
  { name: "field-burst", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "burst",
  "at": 1,
  "text": "Example message",
  "burst": {
    "version": 1,
    "burstId": "burstId-example",
    "botId": "botId-example",
    "task": "Example",
    "phase": "preview",
    "total": 1,
    "requested": 1,
    "parallel": 1,
    "modelName": "Example",
    "estimateMinutes": 1,
    "counts": {
      "failed": 1,
      "queued": 1,
      "running": 1,
      "cancelled": 1,
      "done": 1
    },
    "sample": []
  }
} satisfies WireMessage },
  { name: "field-automation", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "automation": {
    "routineId": "routineId-example",
    "runId": "runId-example",
    "name": "Example",
    "trigger": "app",
    "executionThreadId": "executionThreadId-example",
    "scheduledFor": 1
  }
} satisfies WireMessage },
  { name: "field-goalRun", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "goal.run",
  "at": 1,
  "text": "Example message",
  "goalRun": {
    "runId": "runId-example",
    "goal": "Example",
    "status": "failed",
    "coordinatorBotId": "coordinatorBotId-example",
    "coordinatorName": "Example",
    "turnCount": 1,
    "maxTurns": 1,
    "startedAt": 1
  }
} satisfies WireMessage },
  { name: "field-call", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "call",
  "at": 1,
  "text": "Example message",
  "call": {
    "callId": "callId-example",
    "botId": "botId-example",
    "client": "desktop",
    "startedAt": 1,
    "endedAt": 1,
    "seconds": 1,
    "endReason": "hung-up"
  }
} satisfies WireMessage },
  { name: "field-tool", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "tool": {
    "name": "Example"
  }
} satisfies WireMessage },
  { name: "field-webhookPost", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "webhookPost": false
} satisfies WireMessage },
  { name: "field-steered", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "steered": false
} satisfies WireMessage },
  { name: "field-aside", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "aside": false
} satisfies WireMessage },
  { name: "field-via", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "via": "call"
} satisfies WireMessage },
  { name: "field-callId", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "callId": "callId-example"
} satisfies WireMessage },
  { name: "field-relayed", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "relayed": false
} satisfies WireMessage },
  { name: "field-sender", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "sender": {
    "name": "Example"
  }
} satisfies WireMessage },
  { name: "field-turnId", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "turnId": "turnId-example"
} satisfies WireMessage },
  { name: "field-stoppedBy", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "stoppedBy": {
    "name": "Example"
  }
} satisfies WireMessage },
  { name: "field-itemId", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "itemId": "itemId-example"
} satisfies WireMessage },
  { name: "field-requestMessageId", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "requestMessageId": "requestMessageId-example"
} satisfies WireMessage },
  { name: "field-turnSucceeded", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "turnSucceeded": false
} satisfies WireMessage },
  { name: "field-requestCancelled", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "requestCancelled": false
} satisfies WireMessage },
  { name: "field-requestPending", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "requestPending": false
} satisfies WireMessage },
  { name: "field-turnTerminal", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "turnTerminal": false
} satisfies WireMessage },
  { name: "field-turnCompletedAt", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "turnCompletedAt": 1
} satisfies WireMessage },
  { name: "field-savedSteps", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "savedSteps": {
    "recipeId": "recipeId-example"
  }
} satisfies WireMessage },
  { name: "field-png", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "screen",
  "at": 1,
  "text": "Example message",
  "png": "cGxhY2Vob2xkZXI="
} satisfies WireMessage },
  { name: "field-mime", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "mime": "Example"
} satisfies WireMessage },
  { name: "field-parentId", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "parentId": "parentId-example"
} satisfies WireMessage },
  { name: "field-replyToId", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "replyToId": "replyToId-example"
} satisfies WireMessage },
  { name: "field-sendId", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "sendId": "sendId-example"
} satisfies WireMessage },
  { name: "field-channelMode", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "channelMode": "chat"
} satisfies WireMessage },
  { name: "field-from", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "from": {
    "botId": "botId-example",
    "name": "Example",
    "color": "Example"
  }
} satisfies WireMessage },
  { name: "field-threadPost", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "threadPost": {
    "deliveryId": "deliveryId-example",
    "fromBotId": "fromBotId-example",
    "fromThreadId": "fromThreadId-example"
  }
} satisfies WireMessage },
  { name: "field-peerPost", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "peerPost": {}
} satisfies WireMessage },
  { name: "field-routedBy", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "routedBy": {
    "provider": "jev",
    "probability": 1
  }
} satisfies WireMessage },
  { name: "field-quickModel", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "quickModel": "Example"
} satisfies WireMessage },
  { name: "field-doneWhen", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "doneWhen": "Example"
} satisfies WireMessage },
  { name: "field-peerAsk", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "peerAsk": {
    "botId": "botId-example",
    "name": "Example"
  }
} satisfies WireMessage },
  { name: "field-reactions", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "reactions": []
} satisfies WireMessage },
  { name: "field-reaction", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "reaction": "Example"
} satisfies WireMessage },
  { name: "field-comm", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "comm": {
    "groupId": "groupId-example",
    "withBotId": "withBotId-example",
    "withName": "Example",
    "withColor": "Example"
  }
} satisfies WireMessage },
  { name: "field-relay", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "relay": {
    "kind": "told",
    "email": "person@example.com",
    "name": "Example"
  }
} satisfies WireMessage },
  { name: "field-inbox", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "inbox": {
    "kind": "result",
    "from": {
      "name": "Example"
    }
  }
} satisfies WireMessage },
  { name: "field-threadRef", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "threadRef": {
    "botId": "botId-example",
    "threadId": "threadId-example",
    "title": "Example"
  }
} satisfies WireMessage },
  { name: "field-sentDirectly", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "sentDirectly": {
    "name": "Example"
  }
} satisfies WireMessage },
  { name: "field-publishedPage", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "publishedPage": {
    "state": "live",
    "title": "Example"
  }
} satisfies WireMessage },
  { name: "field-dataResult", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "dataResult": {
    "botId": "botId-example",
    "cardId": "cardId-example",
    "title": "Example",
    "kind": "text"
  }
} satisfies WireMessage },
  { name: "field-dataContext", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "dataContext": {
    "cardId": "cardId-example"
  }
} satisfies WireMessage },
  { name: "field-queued", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "queued": false
} satisfies WireMessage },
  { name: "field-queueId", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "queueId": "queueId-example"
} satisfies WireMessage },
  { name: "field-textCode", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "textCode": "Example"
} satisfies WireMessage },
  { name: "field-textParams", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "textParams": {
    "bot": "Example Bot"
  }
} satisfies WireMessage },
  { name: "field-helperIntro", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "helperIntro": true
} satisfies WireMessage },
  { name: "field-helperFollowup", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "helperFollowup": {
    "ai": "none",
    "apps": [],
    "bots": 1,
    "routines": 1
  }
} satisfies WireMessage },
  { name: "field-setupOffer", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "setupOffer": true
} satisfies WireMessage },
  { name: "field-setupChoices", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "setupChoices": []
} satisfies WireMessage },
  { name: "field-setupChoicesPending", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "setupChoicesPending": true
} satisfies WireMessage },
  { name: "field-setupChoicesUpdating", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "setupChoicesUpdating": 1
} satisfies WireMessage },
  { name: "field-wait", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "wait": {
    "id": "id-example",
    "status": "stopped"
  }
} satisfies WireMessage },
  { name: "field-bugReport", swiftType: "WireMessage", value: {
  "id": "message-example",
  "role": "bot",
  "kind": "text",
  "at": 1,
  "text": "Example message",
  "bugReport": {
    "id": "id-example",
    "status": "received"
  }
} satisfies WireMessage },
] satisfies ContractSample[];

export const cards = [
  { name: "field-lendingLift", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "lendingLift": {
    "requestMessageId": "requestMessageId-example"
  }
} satisfies OptionCardData },
  { name: "field-outboundRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "outboundRequest": {
    "tool": "Example",
    "app": "Example"
  }
} satisfies OptionCardData },
  { name: "field-teamMemoryRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "teamMemoryRequest": {
    "section": "Example",
    "entryId": "entryId-example",
    "kind": "Example"
  }
} satisfies OptionCardData },
  { name: "field-summaryCode", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "summaryCode": "Example"
} satisfies OptionCardData },
  { name: "field-summaryParams", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "summaryParams": {}
} satisfies OptionCardData },
  { name: "field-requestType", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "requestType": "permission"
} satisfies OptionCardData },
  { name: "field-answered", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "answered": "Example"
} satisfies OptionCardData },
  { name: "field-answeredText", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "answeredText": "Example"
} satisfies OptionCardData },
  { name: "field-dismissed", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "dismissed": false
} satisfies OptionCardData },
  { name: "field-answeredBy", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "answeredBy": {
    "kind": "session",
    "name": "Example"
  }
} satisfies OptionCardData },
  { name: "field-requestId", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "requestId": "requestId-example"
} satisfies OptionCardData },
  { name: "field-tool", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "tool": "Example"
} satisfies OptionCardData },
  { name: "field-held", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "held": "Example"
} satisfies OptionCardData },
  { name: "field-expired", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "expired": false
} satisfies OptionCardData },
  { name: "field-stopped", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "stopped": false
} satisfies OptionCardData },
  { name: "field-heldCode", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "heldCode": "Example"
} satisfies OptionCardData },
  { name: "field-allowKey", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "allowKey": "Example"
} satisfies OptionCardData },
  { name: "field-allowSession", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "allowSession": false
} satisfies OptionCardData },
  { name: "field-commandAllowlist", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "commandAllowlist": {
    "command": "Example",
    "cwd": "Example",
    "providerInstanceId": "providerInstanceId-example"
  }
} satisfies OptionCardData },
  { name: "field-approvalScope", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "approvalScope": "local-computer"
} satisfies OptionCardData },
  { name: "field-autoApplied", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "autoApplied": false
} satisfies OptionCardData },
  { name: "field-undone", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "undone": false
} satisfies OptionCardData },
  { name: "field-routineRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "routineRequest": {
    "version": 1,
    "requestId": "requestId-example",
    "botId": "botId-example",
    "threadId": "threadId-example",
    "createdAt": 1,
    "operation": {
      "action": "create",
      "routine": {
        "name": "Example",
        "instructions": "Example",
        "schedule": {
          "type": "once",
          "at": 1
        },
        "runOn": "cloud",
        "durationMinutes": 1
      }
    }
  }
} satisfies OptionCardData },
  { name: "field-webhookRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "webhookRequest": {
    "version": 1,
    "requestId": "requestId-example",
    "botId": "botId-example",
    "threadId": "threadId-example",
    "createdAt": 1,
    "operation": {
      "action": "create",
      "webhook": {
        "name": "Example",
        "instructions": "Example",
        "runOn": "cloud"
      }
    }
  }
} satisfies OptionCardData },
  { name: "field-appTriggerRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "appTriggerRequest": {
    "version": 1,
    "requestId": "requestId-example",
    "botId": "botId-example",
    "threadId": "threadId-example",
    "createdAt": 1,
    "operation": {
      "action": "create",
      "trigger": {
        "name": "Example",
        "instructions": "Example",
        "app": "Example",
        "event": "Example"
      }
    }
  }
} satisfies OptionCardData },
  { name: "field-profileRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "profileRequest": {
    "version": 1,
    "requestId": "requestId-example",
    "botId": "botId-example",
    "threadId": "threadId-example",
    "targetBotId": "targetBotId-example",
    "targetName": "Example",
    "createdAt": 1,
    "reason": "Example",
    "changes": {},
    "before": {},
    "expectedRevision": "Example"
  }
} satisfies OptionCardData },
  { name: "field-modelRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "modelRequest": {
    "version": 1,
    "requestId": "requestId-example",
    "botId": "botId-example",
    "threadId": "threadId-example",
    "targetBotId": "targetBotId-example",
    "targetName": "Example",
    "createdAt": 1,
    "reason": "Example",
    "selection": {
      "instanceId": "instanceId-example",
      "model": "Example"
    },
    "before": {
      "instanceId": "instanceId-example",
      "model": "Example"
    }
  }
} satisfies OptionCardData },
  { name: "field-teamSetupRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "teamSetupRequest": {
    "version": 1,
    "requestId": "requestId-example",
    "botId": "botId-example",
    "threadId": "threadId-example",
    "reason": "Example",
    "createdAt": 1,
    "requesterRevision": "Example",
    "operations": [],
    "newTeams": []
  }
} satisfies OptionCardData },
  { name: "field-mcpRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "mcpRequest": {
    "requestId": "requestId-example",
    "botId": "botId-example",
    "threadId": "threadId-example",
    "action": "enable",
    "name": "Example",
    "targetHash": "Example"
  }
} satisfies OptionCardData },
  { name: "field-skillRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "skillRequest": {
    "version": 1,
    "requestId": "requestId-example",
    "botId": "botId-example",
    "threadId": "threadId-example",
    "stagedId": "stagedId-example",
    "action": "create",
    "name": "Example",
    "gist": "Example",
    "warnings": [],
    "createdAt": 1
  }
} satisfies OptionCardData },
  { name: "field-questionRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "questionRequest": {
    "version": 1,
    "questions": []
  }
} satisfies OptionCardData },
  { name: "field-fixedOptions", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "fixedOptions": false
} satisfies OptionCardData },
  { name: "field-quotaSwitch", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "quotaSwitch": {
    "engines": []
  }
} satisfies OptionCardData },
  { name: "field-yourComputer", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "yourComputer": {}
} satisfies OptionCardData },
  { name: "field-waitRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "waitRequest": {
    "waitId": "waitId-example",
    "label": "Example",
    "followUp": "Example"
  }
} satisfies OptionCardData },
  { name: "field-computerAsk", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "computerAsk": {
    "need": "screen",
    "reason": "blocked",
    "device": "PC",
    "state": "failed"
  }
} satisfies OptionCardData },
  { name: "field-accessRequest", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "accessRequest": {
    "botId": "botId-example",
    "botName": "Example",
    "email": "person@example.com",
    "name": "Example"
  }
} satisfies OptionCardData },
  { name: "field-outsideWrite", swiftType: "OptionCardData", value: {
  "title": "Approve request",
  "subtitle": "Example request",
  "options": [
    "Allow",
    "Deny"
  ],
  "outsideWrite": {
    "kind": "room-bulletin",
    "roomId": "roomId-example",
    "bulletin": "Example"
  }
} satisfies OptionCardData },
] satisfies ContractSample[];

export const frames = [
  { name: "sections-0", swiftType: "ServerFrame", value: {
  "kind": "sections",
  "sections": []
} satisfies ServerFrame },
  { name: "bot.queued-1", swiftType: "ServerFrame", value: {
  "kind": "bot.queued",
  "queues": {}
} satisfies ServerFrame },
  { name: "message-2", swiftType: "ServerFrame", value: {
  "kind": "message",
  "threadId": "threadId-example",
  "message": {
    "id": "id-example",
    "role": "bot",
    "kind": "text",
    "at": 1
  }
} satisfies ServerFrame },
  { name: "message.patch-3", swiftType: "ServerFrame", value: {
  "kind": "message.patch",
  "threadId": "threadId-example",
  "message": {
    "id": "id-example",
    "role": "bot",
    "kind": "text",
    "at": 1
  }
} satisfies ServerFrame },
  { name: "thread-4", swiftType: "ServerFrame", value: {
  "kind": "thread",
  "threadId": "threadId-example",
  "activeLeafId": "activeLeafId-example"
} satisfies ServerFrame },
  { name: "bot-5", swiftType: "ServerFrame", value: {
  "kind": "bot",
  "bot": {
    "id": "id-example",
    "threadId": "threadId-example",
    "name": "Example",
    "title": "Example",
    "description": "Example",
    "notifications": false,
    "color": "green",
    "avatarUrl": "https://cry.example.com",
    "unread": false,
    "modelSelection": {
      "instanceId": "instanceId-example",
      "model": "Example"
    },
    "createdAt": 1
  }
} satisfies ServerFrame },
  { name: "group-6", swiftType: "ServerFrame", value: {
  "kind": "group",
  "group": {
    "id": "id-example",
    "threadId": "threadId-example",
    "name": "Example",
    "memberIds": [],
    "defaultResponder": {
      "kind": "member",
      "botId": "botId-example"
    },
    "bulletin": "Example",
    "unread": false,
    "createdAt": 1,
    "working": false
  }
} satisfies ServerFrame },
  { name: "notify-7", swiftType: "ServerFrame", value: {
  "kind": "notify",
  "notification": {
    "id": "id-example",
    "at": 1,
    "read": false,
    "kind": "secret",
    "botId": "botId-example",
    "botName": "Example",
    "threadId": "threadId-example",
    "title": "Example",
    "body": "Example"
  }
} satisfies ServerFrame },
  { name: "notifications.read-8", swiftType: "ServerFrame", value: {
  "kind": "notifications.read",
  "threadId": "threadId-example",
  "ids": []
} satisfies ServerFrame },
  { name: "group.deleted-9", swiftType: "ServerFrame", value: {
  "kind": "group.deleted",
  "groupId": "groupId-example"
} satisfies ServerFrame },
  { name: "routine-10", swiftType: "ServerFrame", value: {
  "kind": "routine",
  "routine": {
    "id": "id-example",
    "name": "Example",
    "prompt": "Example",
    "target": "bot",
    "botId": "botId-example",
    "runOn": "cloud",
    "enabled": false,
    "schedule": {
      "type": "cron",
      "expression": "0 9 * * *",
      "timeZone": "UTC"
    },
    "durationMinutes": 1,
    "nextRunAt": 1,
    "createdAt": 1,
    "updatedAt": 1
  }
} satisfies ServerFrame },
  { name: "routine.deleted-11", swiftType: "ServerFrame", value: {
  "kind": "routine.deleted",
  "routineId": "routineId-example"
} satisfies ServerFrame },
  { name: "routine.run-12", swiftType: "ServerFrame", value: {
  "kind": "routine.run",
  "run": {
    "id": "id-example",
    "routineId": "routineId-example",
    "routineName": "Example",
    "target": "bot",
    "botId": "botId-example",
    "runOn": "cloud",
    "scheduledFor": 1,
    "status": "failed",
    "manual": false,
    "createdAt": 1
  }
} satisfies ServerFrame },
  { name: "webhook-13", swiftType: "ServerFrame", value: {
  "kind": "webhook",
  "webhook": {
    "id": "id-example",
    "endpointId": "endpointId-example",
    "name": "Example",
    "prompt": "Example",
    "botId": "botId-example",
    "runOn": "cloud",
    "enabled": false,
    "createdAt": 1,
    "updatedAt": 1,
    "deliveryCount": 1
  }
} satisfies ServerFrame },
  { name: "webhook.attempt-14", swiftType: "ServerFrame", value: {
  "kind": "webhook.attempt",
  "attempt": {
    "id": "id-example",
    "webhookId": "webhookId-example",
    "receivedAt": 1,
    "outcome": "accepted",
    "statusCode": 200
  }
} satisfies ServerFrame },
  { name: "webhook.deleted-15", swiftType: "ServerFrame", value: {
  "kind": "webhook.deleted",
  "webhookId": "webhookId-example"
} satisfies ServerFrame },
  { name: "app-trigger-16", swiftType: "ServerFrame", value: {
  "kind": "app-trigger",
  "botId": "botId-example",
  "trigger": {
    "id": "id-example",
    "name": "Example",
    "prompt": "Example",
    "botId": "botId-example",
    "runOn": "cloud",
    "enabled": false,
    "app": "Example",
    "appName": "Example",
    "event": "Example",
    "eventName": "Example",
    "delivery": "instant",
    "accountId": "accountId-example",
    "config": {},
    "remote": {
      "state": "error"
    },
    "received": 1,
    "filtered": 1,
    "createdAt": 1,
    "updatedAt": 1
  }
} satisfies ServerFrame },
  { name: "app-trigger.attempt-17", swiftType: "ServerFrame", value: {
  "kind": "app-trigger.attempt",
  "botId": "botId-example",
  "attempt": {
    "id": "id-example",
    "triggerId": "triggerId-example",
    "eventId": "eventId-example",
    "at": 1,
    "outcome": "duplicate"
  }
} satisfies ServerFrame },
  { name: "app-trigger.deleted-18", swiftType: "ServerFrame", value: {
  "kind": "app-trigger.deleted",
  "triggerId": "triggerId-example"
} satisfies ServerFrame },
  { name: "app-trigger.service-19", swiftType: "ServerFrame", value: {
  "kind": "app-trigger.service",
  "service": {
    "available": false
  }
} satisfies ServerFrame },
  { name: "runtime-20", swiftType: "ServerFrame", value: {
  "kind": "runtime",
  "event": {
    "eventId": "eventId-example",
    "provider": "Example",
    "threadId": "threadId-example",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "type": "session.started",
    "sessionId": "sessionId-example"
  }
} satisfies ServerFrame },
  { name: "mcp.changed-21", swiftType: "ServerFrame", value: {
  "kind": "mcp.changed"
} satisfies ServerFrame },
  { name: "screen-22", swiftType: "ServerFrame", value: {
  "kind": "screen",
  "botId": "botId-example",
  "threadId": "threadId-example",
  "png": "Example"
} satisfies ServerFrame },
  { name: "computer-23", swiftType: "ServerFrame", value: {
  "kind": "computer",
  "botId": "botId-example",
  "state": "provisioning"
} satisfies ServerFrame },
  { name: "computer-control-24", swiftType: "ServerFrame", value: {
  "kind": "computer-control",
  "botId": "botId-example",
  "held": false,
  "helpReason": "Example"
} satisfies ServerFrame },
  { name: "data-25", swiftType: "ServerFrame", value: {
  "kind": "data",
  "botId": "botId-example",
  "sheet": {
    "version": 1,
    "botId": "botId-example",
    "cards": [],
    "sources": [],
    "updatedAt": "Example"
  }
} satisfies ServerFrame },
  { name: "bot.deleted-26", swiftType: "ServerFrame", value: {
  "kind": "bot.deleted",
  "botId": "botId-example"
} satisfies ServerFrame },
  { name: "bots.order-27", swiftType: "ServerFrame", value: {
  "kind": "bots.order",
  "botIds": []
} satisfies ServerFrame },
  { name: "groups.order-28", swiftType: "ServerFrame", value: {
  "kind": "groups.order",
  "groupIds": []
} satisfies ServerFrame },
  { name: "live.call-29", swiftType: "ServerFrame", value: {
  "kind": "live.call",
  "botId": "botId-example",
  "threadId": "threadId-example",
  "call": {
    "callId": "callId-example",
    "botId": "botId-example",
    "threadId": "threadId-example",
    "client": "desktop",
    "voice": "Example",
    "startedAt": 1,
    "status": "live"
  }
} satisfies ServerFrame },
  { name: "device.job-30", swiftType: "ServerFrame", value: {
  "kind": "device.job",
  "phone": "Example",
  "id": "id-example"
} satisfies ServerFrame },
  { name: "team.presence-31", swiftType: "ServerFrame", value: {
  "kind": "team.presence",
  "email": "person@example.com",
  "here": false
} satisfies ServerFrame },
  { name: "thread.presence-32", swiftType: "ServerFrame", value: {
  "kind": "thread.presence",
  "threadId": "threadId-example",
  "people": []
} satisfies ServerFrame },
  { name: "team.people-33", swiftType: "ServerFrame", value: {
  "kind": "team.people"
} satisfies ServerFrame },
  { name: "config-34", swiftType: "ServerFrame", value: {
  "kind": "config"
} satisfies ServerFrame },
] satisfies ContractSample[];

export const runtimeEvents = [
  { name: "session.started-0", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "session.started",
  "sessionId": "sessionId-example"
} satisfies RuntimeEvent },
  { name: "session.model-variants-1", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "session.model-variants",
  "model": "Example",
  "variants": {
    "options": []
  }
} satisfies RuntimeEvent },
  { name: "session.exited-2", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "session.exited"
} satisfies RuntimeEvent },
  { name: "turn.started-3", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "turn.started"
} satisfies RuntimeEvent },
  { name: "turn.retrying-4", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "turn.retrying",
  "attempt": 1,
  "delayMs": 1,
  "reason": "Example"
} satisfies RuntimeEvent },
  { name: "turn.completed-5", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "turn.completed",
  "ok": false
} satisfies RuntimeEvent },
  { name: "cap.exhausted-6", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "cap.exhausted",
  "handoffPath": "Example",
  "reason": "cap"
} satisfies RuntimeEvent },
  { name: "turn.wait_started-7", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "turn.wait_started",
  "resource": "Example"
} satisfies RuntimeEvent },
  { name: "turn.wait_ended-8", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "turn.wait_ended",
  "resource": "Example",
  "waitedMs": 1,
  "outcome": "stopped"
} satisfies RuntimeEvent },
  { name: "item.started-9", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "item.started",
  "itemType": "tool"
} satisfies RuntimeEvent },
  { name: "item.updated-10", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "item.updated",
  "itemType": "tool"
} satisfies RuntimeEvent },
  { name: "item.output-11", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "item.output",
  "itemType": "tool",
  "text": "Example"
} satisfies RuntimeEvent },
  { name: "turn.progress-12", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "activity": "web",
  "type": "turn.progress"
} satisfies RuntimeEvent },
  { name: "item.completed-13", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "item.completed",
  "itemType": "tool",
  "ok": false
} satisfies RuntimeEvent },
  { name: "item.completed-14", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "item.completed",
  "itemType": "assistant_text",
  "text": "Example"
} satisfies RuntimeEvent },
  { name: "item.completed-15", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "item.completed",
  "itemType": "assistant_image",
  "data": "Example"
} satisfies RuntimeEvent },
  { name: "content.delta-16", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "content.delta",
  "streamKind": "assistant_text",
  "delta": "Example"
} satisfies RuntimeEvent },
  { name: "request.opened-17", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "request.opened",
  "requestType": "permission",
  "tool": "Example",
  "summary": "Example"
} satisfies RuntimeEvent },
  { name: "request.resolved-18", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "request.resolved",
  "behavior": "allow",
  "source": "user"
} satisfies RuntimeEvent },
  { name: "thread.token-usage.updated-19", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "thread.token-usage.updated",
  "input": 1,
  "output": 1
} satisfies RuntimeEvent },
  { name: "runtime.error-20", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "runtime.error",
  "message": "Example"
} satisfies RuntimeEvent },
  { name: "runtime.notice-21", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "runtime.notice",
  "message": "Example"
} satisfies RuntimeEvent },
  { name: "context.compacted-22", swiftType: "RuntimeEvent", value: {
  "eventId": "eventId-example",
  "provider": "Example",
  "threadId": "threadId-example",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "type": "context.compacted"
} satisfies RuntimeEvent },
] satisfies ContractSample[];

export const chartSpecs = [
  { name: "bar", swiftType: "CryChartSpec", value: {
  "type": "bar",
  "x": "category",
  "y": "value"
} satisfies CryChartSpec },
  { name: "line", swiftType: "CryChartSpec", value: {
  "type": "line",
  "x": "category",
  "y": "value"
} satisfies CryChartSpec },
  { name: "area", swiftType: "CryChartSpec", value: {
  "type": "area",
  "x": "category",
  "y": "value"
} satisfies CryChartSpec },
  { name: "scatter", swiftType: "CryChartSpec", value: {
  "type": "scatter",
  "x": "category",
  "y": "value"
} satisfies CryChartSpec },
  { name: "histogram", swiftType: "CryChartSpec", value: {
  "type": "histogram",
  "x": "category",
  "y": "value"
} satisfies CryChartSpec },
  { name: "pie", swiftType: "CryChartSpec", value: {
  "type": "pie",
  "x": "category",
  "y": "value"
} satisfies CryChartSpec },
  { name: "heatmap", swiftType: "CryChartSpec", value: {
  "type": "heatmap",
  "x": "category",
  "y": "value"
} satisfies CryChartSpec },
] satisfies ContractSample[];

export const widgets = [
  { name: "Card", swiftType: "WidgetNode", value: {
  "type": "Card",
  "id": "n1",
  "children": []
} satisfies WidgetNode },
  { name: "ListView", swiftType: "WidgetNode", value: {
  "type": "ListView",
  "id": "n1",
  "children": []
} satisfies WidgetNode },
  { name: "ListViewItem", swiftType: "WidgetNode", value: {
  "type": "ListViewItem",
  "id": "n1",
  "children": []
} satisfies WidgetNode },
  { name: "Box", swiftType: "WidgetNode", value: {
  "type": "Box",
  "id": "n1",
  "children": []
} satisfies WidgetNode },
  { name: "Row", swiftType: "WidgetNode", value: {
  "type": "Row",
  "id": "n1",
  "children": []
} satisfies WidgetNode },
  { name: "Col", swiftType: "WidgetNode", value: {
  "type": "Col",
  "id": "n1",
  "children": []
} satisfies WidgetNode },
  { name: "Form", swiftType: "WidgetNode", value: {
  "type": "Form",
  "id": "n1",
  "children": []
} satisfies WidgetNode },
  { name: "Spacer", swiftType: "WidgetNode", value: {
  "type": "Spacer",
  "id": "n1"
} satisfies WidgetNode },
  { name: "Divider", swiftType: "WidgetNode", value: {
  "type": "Divider",
  "id": "n1"
} satisfies WidgetNode },
  { name: "Table", swiftType: "WidgetNode", value: {
  "type": "Table",
  "id": "n1",
  "children": []
} satisfies WidgetNode },
  { name: "Table.Row", swiftType: "WidgetNode", value: {
  "type": "Table.Row",
  "id": "n1",
  "children": []
} satisfies WidgetNode },
  { name: "Table.Cell", swiftType: "WidgetNode", value: {
  "type": "Table.Cell",
  "id": "n1",
  "children": []
} satisfies WidgetNode },
  { name: "Text", swiftType: "WidgetNode", value: {
  "type": "Text",
  "id": "n1",
  "value": "Example"
} satisfies WidgetNode },
  { name: "Title", swiftType: "WidgetNode", value: {
  "type": "Title",
  "id": "n1",
  "value": "Example"
} satisfies WidgetNode },
  { name: "Caption", swiftType: "WidgetNode", value: {
  "type": "Caption",
  "id": "n1",
  "value": "Example"
} satisfies WidgetNode },
  { name: "Label", swiftType: "WidgetNode", value: {
  "type": "Label",
  "id": "n1",
  "value": "Example"
} satisfies WidgetNode },
  { name: "Markdown", swiftType: "WidgetNode", value: {
  "type": "Markdown",
  "id": "n1",
  "value": "Example"
} satisfies WidgetNode },
  { name: "Image", swiftType: "WidgetNode", value: {
  "type": "Image",
  "id": "n1",
  "src": "https://cry.example.com",
  "alt": "Example"
} satisfies WidgetNode },
  { name: "Icon", swiftType: "WidgetNode", value: {
  "type": "Icon",
  "id": "n1",
  "name": "info"
} satisfies WidgetNode },
  { name: "Chart", swiftType: "WidgetNode", value: {
  "type": "Chart",
  "id": "n1",
  "data": [
    {
      "category": "Example",
      "value": 1
    }
  ],
  "series": [
    {
      "type": "bar",
      "dataKey": "value",
      "label": "Value"
    }
  ],
  "xAxis": {
    "dataKey": "category"
  }
} satisfies WidgetNode },
  { name: "Badge", swiftType: "WidgetNode", value: {
  "type": "Badge",
  "id": "n1",
  "label": "Ready"
} satisfies WidgetNode },
  { name: "Progress", swiftType: "WidgetNode", value: {
  "type": "Progress",
  "id": "n1",
  "value": 50
} satisfies WidgetNode },
  { name: "Button", swiftType: "WidgetNode", value: {
  "type": "Button",
  "id": "n1",
  "label": "Continue",
  "onClickAction": {
    "type": "submit"
  }
} satisfies WidgetNode },
  { name: "Select", swiftType: "WidgetNode", value: {
  "type": "Select",
  "id": "n1",
  "name": "choice",
  "options": [
    {
      "label": "One",
      "value": "one"
    }
  ]
} satisfies WidgetNode },
  { name: "DatePicker", swiftType: "WidgetNode", value: {
  "type": "DatePicker",
  "id": "n1",
  "name": "date"
} satisfies WidgetNode },
  { name: "TimePicker", swiftType: "WidgetNode", value: {
  "type": "TimePicker",
  "id": "n1",
  "name": "time"
} satisfies WidgetNode },
  { name: "DayPicker", swiftType: "WidgetNode", value: {
  "type": "DayPicker",
  "id": "n1",
  "name": "days"
} satisfies WidgetNode },
  { name: "Checkbox", swiftType: "WidgetNode", value: {
  "type": "Checkbox",
  "id": "n1",
  "name": "confirmed",
  "label": "Confirm"
} satisfies WidgetNode },
  { name: "RadioGroup", swiftType: "WidgetNode", value: {
  "type": "RadioGroup",
  "id": "n1",
  "name": "choice",
  "options": [
    {
      "label": "One",
      "value": "one"
    }
  ]
} satisfies WidgetNode },
  { name: "Input", swiftType: "WidgetNode", value: {
  "type": "Input",
  "id": "n1",
  "name": "name"
} satisfies WidgetNode },
  { name: "Textarea", swiftType: "WidgetNode", value: {
  "type": "Textarea",
  "id": "n1",
  "name": "notes"
} satisfies WidgetNode },
  { name: "Transition", swiftType: "WidgetNode", value: {
  "type": "Transition",
  "id": "n1",
  "children": [
    {
      "type": "Text",
      "id": "n2",
      "value": "Example"
    }
  ]
} satisfies WidgetNode },
] satisfies ContractSample[];

export const entities = [
  { name: "example", swiftType: "WireBot", value: {
  "id": "id-example",
  "threadId": "threadId-example",
  "name": "Example",
  "title": "Example",
  "description": "Example",
  "notifications": false,
  "color": "green",
  "avatarUrl": "https://cry.example.com",
  "unread": false,
  "modelSelection": {
    "instanceId": "instanceId-example",
    "model": "Example"
  },
  "createdAt": 1
} satisfies WireBot },
  { name: "example", swiftType: "WireGroup", value: {
  "id": "id-example",
  "threadId": "threadId-example",
  "name": "Example",
  "memberIds": [],
  "defaultResponder": {
    "kind": "member",
    "botId": "botId-example"
  },
  "bulletin": "Example",
  "unread": false,
  "createdAt": 1,
  "working": false
} satisfies WireGroup },
] satisfies ContractSample[];

export function canonicalWidget(node: WidgetNode): WidgetNode {
  const input = node.type === "Table.Row" ? { type: "Table", children: [node] }
    : node.type === "Table.Cell" ? { type: "Table", children: [{ type: "Table.Row", children: [node] }] } : node;
  const parsed = parseWidgetInput(input);
  if (!parsed.ok) throw new Error(`${node.type}: ${parsed.error}`);
  function find(current: WidgetNode): WidgetNode | undefined {
    if (current.type === node.type) return current;
    return current.children?.map(find).find(found => found !== undefined);
  }
  const canonical = find(parsed.value);
  if (!canonical) throw new Error(`Missing normalized widget ${node.type}`);
  return canonical;
}

export const typedSamples = [...entities, ...messages, ...cards, ...frames, ...runtimeEvents, ...chartSpecs, ...widgets.map(sample => ({ ...sample, value: canonicalWidget(sample.value) }))];
