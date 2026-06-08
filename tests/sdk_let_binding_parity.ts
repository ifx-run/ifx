import { expect } from "chai";

import { binding } from "../sdk/src/binding";
import { encodeLetBinding } from "../sdk/src/codec";
import { expr } from "../sdk/src/expr";
import {
  LET_BINDING_NEXT_TAG,
  LET_BINDING_VARIANT,
  LET_BINDING_VARIANT_COUNT,
  type LetBindingVariantKey,
} from "../sdk/src/let-binding-variants";
import type { LetBinding } from "../sdk/src/types";
import idl from "../idl/ifx.json";

function pascalToCamel(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** One minimal encoded sample per wire variant (tag = index in {@link LET_BINDING_VARIANT}). */
function sampleBinding(key: LetBindingVariantKey): LetBinding {
  switch (key) {
    case "accountDataSlice":
      return binding.accountDataSlice({ u64: {} }, 0, 0, 0);
    case "accountLamports":
      return binding.accountLamports(0);
    case "accountDataLen":
      return binding.accountDataLen(0);
    case "eval":
      return binding.eval(expr.u64(1));
    case "sysvarClockSlot":
      return binding.sysvarClockSlot();
    case "sysvarClockEpochStartTimestamp":
      return binding.sysvarClockEpochStartTimestamp();
    case "sysvarClockEpoch":
      return binding.sysvarClockEpoch();
    case "sysvarClockLeaderScheduleEpoch":
      return binding.sysvarClockLeaderScheduleEpoch();
    case "sysvarClockUnixTimestamp":
      return binding.sysvarClockUnixTimestamp();
    case "sysvarRentMinimumBalance":
      return binding.sysvarRentMinimumBalance(165);
    case "splTokenAccountAmount":
      return binding.splTokenAccountAmount(0);
    case "splTokenAccountDelegatedAmount":
      return binding.splTokenAccountDelegatedAmount(0);
    case "splTokenAccountState":
      return binding.splTokenAccountState(0);
    case "splMintSupply":
      return binding.splMintSupply(0);
    case "splMintDecimals":
      return binding.splMintDecimals(0);
    case "splToken2022AccountAmount":
      return binding.splToken2022AccountAmount(0);
    case "splToken2022AccountDelegatedAmount":
      return binding.splToken2022AccountDelegatedAmount(0);
    case "splToken2022AccountState":
      return binding.splToken2022AccountState(0);
    case "splToken2022MintSupply":
      return binding.splToken2022MintSupply(0);
    case "splToken2022MintDecimals":
      return binding.splToken2022MintDecimals(0);
    case "splToken2022AccountTransferFeeWithheld":
      return binding.splToken2022AccountTransferFeeWithheld(0);
    case "splToken2022MintTransferFeeBasisPoints":
      return binding.splToken2022MintTransferFeeBasisPoints(0);
    case "splToken2022MintTransferFeeMaximum":
      return binding.splToken2022MintTransferFeeMaximum(0);
    case "splToken2022MintWithheldAmount":
      return binding.splToken2022MintWithheldAmount(0);
    case "splToken2022MintDefaultAccountState":
      return binding.splToken2022MintDefaultAccountState(0);
    default: {
      const _exhaustive: never = key;
      throw new Error(`missing sample for ${String(_exhaustive)}`);
    }
  }
}

describe("sdk LetBinding wire parity", () => {
  it("LET_BINDING_VARIANT matches IDL enum order (tags 0..n-1)", () => {
    const def = idl.types.find((t) => t.name === "LetBinding");
    expect(def?.type.kind).to.equal("enum");
    const idlKeys = def!.type.variants.map((v) => pascalToCamel(v.name));
    expect(idlKeys).to.deep.equal([...LET_BINDING_VARIANT]);
    expect(LET_BINDING_VARIANT_COUNT).to.equal(25);
    expect(LET_BINDING_NEXT_TAG).to.equal(25);
  });

  it("binding.* exposes a builder for every wire variant key", () => {
    for (const key of LET_BINDING_VARIANT) {
      expect(typeof (binding as Record<string, unknown>)[key]).to.equal(
        "function"
      );
    }
  });

  it("encodeLetBinding writes tag = LET_BINDING_VARIANT index", () => {
    for (let tag = 0; tag < LET_BINDING_VARIANT.length; tag++) {
      const key = LET_BINDING_VARIANT[tag];
      const encoded = encodeLetBinding(sampleBinding(key));
      expect(encoded[0]).to.equal(tag);
    }
  });
});
