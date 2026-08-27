// Legacy runtime config migration for bindings peer.kind dm→direct.
import {
  defineLegacyConfigMigration,
  getRecord,
  type LegacyConfigMigrationSpec,
  type LegacyConfigRule,
} from "../../../config/legacy.shared.js";

const BINDING_PEER_KIND_DM_RULE: LegacyConfigRule = {
  path: ["bindings"],
  message: 'bindings[].match.peer.kind "dm" was renamed to "direct". Run "openclaw doctor --fix".',
  match: (value) => {
    if (!Array.isArray(value)) {
      return false;
    }
    return value.some((binding) => {
      const match = getRecord(binding)?.match;
      const peer = getRecord(match)?.peer;
      return getRecord(peer)?.kind === "dm";
    });
  },
};

/** Legacy config migration spec for bindings peer.kind dm→direct. */
export const LEGACY_CONFIG_MIGRATIONS_RUNTIME_BINDINGS: LegacyConfigMigrationSpec[] = [
  defineLegacyConfigMigration({
    id: "bindings.peer.kind-dm->direct",
    describe: 'Rewrite bindings peer.kind "dm" to "direct"',
    legacyRules: [BINDING_PEER_KIND_DM_RULE],
    apply: (raw, changes) => {
      const bindings = raw.bindings;
      if (!Array.isArray(bindings)) {
        return;
      }
      let count = 0;
      for (const binding of bindings) {
        const match = getRecord(binding)?.match;
        const peer = getRecord(match)?.peer;
        const peerRecord = getRecord(peer);
        if (peerRecord?.kind === "dm") {
          peerRecord.kind = "direct";
          count += 1;
        }
      }
      if (count > 0) {
        changes.push(
          `Rewrote ${count} binding${count === 1 ? "" : "s"} peer.kind "dm" → "direct".`,
        );
      }
    },
  }),
];
