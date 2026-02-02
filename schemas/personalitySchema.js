export const personalitySchema = {
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "The name of the personality."
    },
    "description": {
      "type": "string",
      "description": "A brief description of the personality."
    },
    "version": {
      "type": "string",
      "description": "The version of the personality, indicating its evolution."
    },
    "tone": {
      "type": "string",
      "description": "The tone of the personality, e.g., friendly, formal, etc."
    },
    "style": {
      "type": "string",
      "description": "The style of interaction of the personality, e.g., concise, elaborate, etc."
    },
    "values": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Core values that guide the personality's responses."
    },
    "constraints": {
      "type": "object",
      "properties": {
        "mustNot": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Things that the personality must not do or express."
        },
        "shouldAvoid": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Things that the personality should avoid doing or expressing."
        }
      },
      "required": [
        "mustNot",
        "shouldAvoid"
      ],
      "additionalProperties": false
    },
    "mutable": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "preference": {
            "type": "string",
            "description": "The preference that is evolving."
          },
          "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "When the preference was updated."
          }
        },
        "required": [
          "preference",
          "timestamp"
        ],
        "additionalProperties": false
      },
      "description": "A list of mutable preferences with timestamps to track changes over time."
    },
    "pillars": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "category": {
            "type": "string",
            "description": "Knowledge category (e.g., 'Programming Preferences', 'Core Mission', 'User Interaction Patterns')"
          },
          "details": {
            "type": "string",
            "description": "The synthesized knowledge block containing evergreen insights"
          },
          "importance": {
            "type": "integer",
            "minimum": 1,
            "maximum": 10,
            "description": "Priority ranking from 1 (low) to 10 (high)"
          },
          "lastUpdated": {
            "type": "string",
            "format": "date-time",
            "description": "When this pillar was last modified"
          }
        },
        "required": [
          "category",
          "details",
          "importance",
          "lastUpdated"
        ],
        "additionalProperties": false
      },
      "description": "Distilled evergreen knowledge that survives rolling window deletions. Consolidated from summaries."
    },
    "audit": {
      "type": "object",
      "properties": {
        "createdAt": {
          "type": "string",
          "format": "date-time",
          "description": "The timestamp when the personality was created."
        },
        "updatedAt": {
          "type": "string",
          "format": "date-time",
          "description": "The timestamp of the last update to the personality."
        },
        "updatedBy": {
          "type": "string",
          "description": "Identifier of who updated the personality."
        },
        "changeLog": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "change": {
                "type": "string",
                "description": "Description of the change made."
              },
              "timestamp": {
                "type": "string",
                "format": "date-time",
                "description": "When the change was made."
              }
            },
            "required": [
              "change",
              "timestamp"
            ],
            "additionalProperties": false
          },
          "description": "A log of changes made to the personality."
        }
      },
      "required": [
        "createdAt",
        "updatedAt",
        "updatedBy",
        "changeLog"
      ],
      "additionalProperties": false
    },
    "compatibility": {
      "type": "object",
      "properties": {
        "policy": {
          "type": "string",
          "description": "Policies that the personality must comply with."
        }
      },
      "required": [
        "policy"
      ],
      "additionalProperties": false
    }
  },
  "required": [
    "name",
    "description",
    "version",
    "tone",
    "style",
    "values",
    "constraints",
    "mutable",
    "pillars",
    "audit",
    "compatibility"
  ],
  "additionalProperties": false
};
