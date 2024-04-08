
import { RuneIdType, RunestoneType } from "../../src/runes/types";
import { SpacedRune, Runestone, RuneId } from "../../src/runes/rune";
import { Transaction } from "../../src/transaction/index"

describe("rune", function () {

  function etching() {
    const rune = SpacedRune.format("AAAAAAAA.BBBBBBBB.DDDD");

    const runestone = new Runestone({
        cenotaph: false,
        edicts: [{
            id: {
                height: 0n,
                index: 0n
            } as RuneIdType,
            amount: 100n,
            output: 0
        }],
        etching: {
            divisibility: 1,
            premine: 100n,
            rune: rune.rune, 
            spacers: rune.spacers,
            symbol: 0,
            terms: {
                amount: 100n,
                cap: 1000n,
                start_height: 0,
                end_height: 0,
                start_offset: 0,
                end_offset: 100
            }
        },
        mint: {
            height: 0n,
            index: 0n,
        } as RuneIdType,
        pointer: 0
    } as RunestoneType) 
    // console.log( runestone.encipher())
    return runestone
  }

  it("format rune", async function () {
    
    const runestone = etching()

    console.log( runestone.encipher())

  });

  it("runestone", async function () {

  })

  it("rune transaction", async function(){

  })
})