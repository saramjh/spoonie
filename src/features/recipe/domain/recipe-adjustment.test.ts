import { describe, expect, it } from "vitest"
import { selectReference, parseAmountInput, initialReferenceIndex, scaleForReference } from "./recipe-adjustment"

describe("single-reference recipe quantity adjustment", () => {
  const originals = [{ name: "감자", amount: 300, unit: "g" }, { name: "밀가루", amount: 60, unit: "g" }, { name: "소금", amount: 0, unit: "약간" }]

  it("only allows a positive original ingredient to be the reference", () => {
    expect(initialReferenceIndex(originals)).toBe(0)
    expect(selectReference(originals, 2, 1.5)).toBeNull()
    expect(selectReference(originals, 1, 1.5)).toEqual({ index: 1, target: 90 })
  })
  it("always calculates the ratio from original values, not a rounded displayed ingredient", () => {
    const chosen = selectReference(originals, 1, 1.5)!
    expect(scaleForReference(originals, chosen)).toBe(1.5)
    expect(originals[0].amount * scaleForReference(originals, chosen)!).toBe(450)
    expect(selectReference(originals, 0, 1.5)).toEqual({ index: 0, target: 450 })
  })
  it("preserves fractions and rejects partial, negative or non-finite user input", () => {
    expect(parseAmountInput("0.25")).toBe(0.25)
    expect(parseAmountInput(".5")).toBe(0.5)
    for(const value of ["", "0", "1/4", "-2", "1e1000", "2g", "20.3.1", "Infinity"]) {
      expect(parseAmountInput(value)).toBeNull()
    }
  })
  it("rejects excessively large ratios and unsafe derived values instead of silently applying the original scale", () => {
    expect(scaleForReference([{name: "tiny",amount:1e-100,unit:"g"},{name:"usual",amount:100,unit:"g"}], {index:0,target:1e9})).toBeNull()
    expect(scaleForReference(originals, {index:0,target:1e9})).toBeNull()
  })
  it("does not produce an invalid scale when original amount or target is zero", () => {
    expect(scaleForReference(originals, { index: 2, target: 10 })).toBeNull()
    expect(scaleForReference(originals, { index: 1, target: 0 })).toBeNull()
  })
})
