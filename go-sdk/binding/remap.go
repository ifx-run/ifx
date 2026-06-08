package binding

// RemapAccountIndex sets account_index on account-scoped bindings.
func RemapAccountIndex(b Node, accountIndex uint8) Node {
	switch v := b.(type) {
	case AccountIndex:
		v.AccountIndex = accountIndex
		return v
	case AccountDataSlice:
		v.AccountIndex = accountIndex
		return v
	default:
		return b
	}
}
