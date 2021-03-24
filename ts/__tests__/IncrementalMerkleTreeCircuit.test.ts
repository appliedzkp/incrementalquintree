jest.setTimeout(90000)
jest.setTimeout(90000)
import { 
    genWitness,
    getSignalByName,
    hash2,
    genRandomSalt,
    stringifyBigInts,
} from './utils'

import {
    IncrementalQuinTree,
} from '../IncrementalQuinTree'

const LEVELS = 4
const ZERO_VALUE = 0

describe('Merkle Tree circuits', () => {
    describe('LeafExists', () => {
        const circuit = 'merkleTreeLeafExists_test'

        it('Valid LeafExists inputs should work', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 2, hash2)
            const leaves: BigInt[] = []

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                tree.insert(randomVal)
                leaves.push(randomVal)
            }

            const root = tree.root

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const proof = tree.genMerklePath(i)
                const circuitInputs = stringifyBigInts({
                    leaf: leaves[i],
                    path_elements: proof.pathElements,
                    path_index: proof.indices,
                    root,
                })

                const witness = await genWitness(circuit, circuitInputs)
                const circuitRoot = await getSignalByName(circuit, witness, 'main.root')
                expect(circuitRoot).toEqual(root.toString())
            }
        })

        it('Invalid LeafExists inputs should not work', async () => {
            expect.assertions(2 * (2 ** LEVELS))
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 2, hash2)

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                tree.insert(randomVal)
            }

            const root = tree.root

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const proof = tree.genMerklePath(i)
                proof.pathElements[0][0] = BigInt(proof.pathElements[0][0]) + BigInt(1)
                const isValid = IncrementalQuinTree.verifyMerklePath(
                    proof,
                    tree.hashFunc,
                )
                expect(isValid).toBeFalsy()

                const circuitInputs = stringifyBigInts({
                    leaf: tree.leaves[i],
                    path_index: proof.indices,
                    path_elements: proof.pathElements,
                    root,
                })

                try {
                    await genWitness(circuit, circuitInputs)
                } catch {
                    expect(true).toBeTruthy()
                }
            }
        })
    })

    describe('CheckRoot', () => {
        const circuit = 'merkleTreeCheckRoot_test'

        it('Valid CheckRoot inputs should work', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 2, hash2)
            const leaves: BigInt[] = []

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                tree.insert(randomVal)
                leaves.push(randomVal)
            }

            const root = tree.root

            const circuitInputs = stringifyBigInts({ leaves })

            const witness = await genWitness(circuit, circuitInputs)
            const circuitRoot = await getSignalByName(circuit, witness, 'main.root')
            expect(circuitRoot.toString()).toEqual(root.toString())
        })

        it('Different leaves should generate a different root', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 2, hash2)
            const leaves: BigInt[] = []
            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                const leaf = randomVal
                tree.insert(leaf)

                // Give the circuit a different leaf
                leaves.push(BigInt(randomVal) + BigInt(1))
            }

            const root = tree.root
            const circuitInputs = stringifyBigInts({ leaves })
            const witness = await genWitness(circuit, circuitInputs)
            const circuitRoot = await getSignalByName(circuit, witness, 'main.root')
            expect(circuitRoot.toString())
                .not.toEqual(root.toString())
        })
    })

    describe('MerkleTreeInclusionProof', () => {
        const circuit = 'merkleTreeInclusionProof_test'

        it('Valid update proofs should work', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 2, hash2)

            // Populate the tree
            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                const leaf = randomVal
                tree.insert(leaf)
            }

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                const leaf = randomVal

                tree.update(i, leaf)

                const proof = tree.genMerklePath(i)

                const root = tree.root

                const circuitInputs = stringifyBigInts({
                    leaf,
                    path_elements: proof.pathElements,
                    path_index: proof.indices
                })

                const witness = await genWitness(circuit, circuitInputs)
                const circuitRoot = await getSignalByName(circuit, witness, 'main.root')
                expect(circuitRoot).toEqual(root.toString())
            }
        })

        it('Invalid update proofs should not work', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 2, hash2)

            // Populate the tree
            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                const leaf = randomVal
                tree.insert(leaf)
            }

            for (let i = 0; i < 2 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                const leaf = randomVal

                tree.update(i, leaf)

                const proof = tree.genMerklePath(i)

                // Delibrately create an invalid proof
                proof.pathElements[0][0] = BigInt(1)

                const isValid = IncrementalQuinTree.verifyMerklePath(
                    proof,
                    tree.hashFunc,
                )
                expect(isValid).toBeFalsy()

                const circuitInputs = stringifyBigInts({
                    leaf: leaf.toString(),
                    path_elements: proof.pathElements,
                    path_index: proof.indices,
                })

                const witness = await genWitness(circuit, circuitInputs)
                const circuitRoot = await getSignalByName(circuit, witness, 'main.root')
                expect(circuitRoot).not.toEqual(tree.root.toString())
            }
        })
    })
})
