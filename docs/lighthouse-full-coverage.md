[中文](./lighthouse-full-coverage.zh-CN.md) | English

# Lighthouse full coverage (R5 / LB-5)

**Status:** completed (R5 / LB-5)
**Parent:** [lighthouse-coverage.md](./lighthouse-coverage.md) · [typed-let-bindings.md](./typed-let-bindings.md)

Spec to close **100% semantic coverage** of Lighthouse assert domains via new typed `LetBinding` tags **45–67**. **Memory PDA remains out of scope** (composable delta instead).

See the Chinese doc for the full tag table, stake state encoding, and acceptance checklist.

---

## Tag summary (45–67)

| Range | Domain |
|-------|--------|
| 45–47 | AccountInfo: program owner, executable, rent_epoch |
| 48–53 | SPL Token account fields + `OwnerIsDerived` |
| 54–59 | Token-2022 account (symmetric) |
| 60–64 | Stake: state, custodian, rent reserve, credits, flags |
| 65–67 | Upgradeable loader typed unpack |

**Next append-only tag after R5:** **68**.
