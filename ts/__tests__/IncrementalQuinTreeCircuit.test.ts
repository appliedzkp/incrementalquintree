jest.setTimeout(90000)
import { 
    genWitness,
    getSignalByName,
    hash5,
    stringifyBigInts,
    genRandomSalt,
} from './utils'

import {
    IncrementalQuinTree,
} from '../IncrementalQuinTree'

const LEVELS = 3
const ZERO_VALUE = 0

describe('Quin Merkle Tree circuits', () => {
    describe('QuinTreeInsertionProof', () => {
        const circuit = 'quinTreeInclusionProof_test' 

        it('Valid QuinTreeInsertionProof inputs should work', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 5, hash5)

            for (let i = 0; i < 30; i++) {
                const randomVal = genRandomSalt()
                tree.insert(randomVal)
            }
            const index = 7
            const path = tree.genMerklePath(index)
            const isValid = IncrementalQuinTree.verifyMerklePath(
                path,
                tree.hashFunc,
            )
            expect(isValid).toBeTruthy()

            const circuitInputs = stringifyBigInts({
                path_elements: path.pathElements,
                path_index: path.indices,
                leaf: tree.leaves[index],
            })
            const witness = await genWitness(circuit, circuitInputs)
            const circuitRoot = await getSignalByName(circuit, witness, 'main.root')
            expect(circuitRoot).toEqual(tree.root.toString())
        })

        it('An modified Merkle proof should produce a different root', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 5, hash5)

            for (let i = 0; i < 30; i++) {
                const randomVal = genRandomSalt()
                tree.insert(randomVal)
            }
            const index = 7
            const path = tree.genMerklePath(index)
            const isValid = IncrementalQuinTree.verifyMerklePath(
                path,
                tree.hashFunc,
            )
            expect(isValid).toBeTruthy()

            path.pathElements[0][0] = genRandomSalt()

            const circuitInputs = stringifyBigInts({
                path_elements: path.pathElements,
                path_index: path.indices,
                leaf: tree.leaves[index],
            })

            const witness = await genWitness(circuit, circuitInputs)
            const circuitRoot = await getSignalByName(circuit, witness, 'main.root')
            expect(circuitRoot.toString()).not.toEqual(tree.root.toString())
        })
    })

    describe('QuinLeafExists', () => {
        const circuit = 'quinTreeLeafExists_test'

        it('Valid QuinLeafExists inputs should work', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 5, hash5)

            const index = 7
            for (let i = 0; i < 30; i++) {
                const randomVal = genRandomSalt()
                tree.insert(randomVal)
            }
            const path = tree.genMerklePath(index)
            const isValid = IncrementalQuinTree.verifyMerklePath(
                path,
                tree.hashFunc,
            )
            expect(isValid).toBeTruthy()

            const circuitInputs = stringifyBigInts({
                path_elements: path.pathElements,
                path_index: path.indices,
                leaf: tree.leaves[index],
                root: tree.root,
            })
            const witness = await genWitness(circuit, circuitInputs)
            expect(witness[0]).toEqual('1')
        })

        it('Invalid QuinLeafExists inputs should not work', async () => {
            expect.assertions(2)
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 5, hash5)

            const index = 7
            for (let i = 0; i < 30; i++) {
                const randomVal = genRandomSalt()
                tree.insert(randomVal)
            }
            const path = tree.genMerklePath(index)
            const isValid = IncrementalQuinTree.verifyMerklePath(
                path,
                tree.hashFunc,
            )
            expect(isValid).toBeTruthy()

            // Tamper with the Merkle proof
            path.pathElements[0][0] = BigInt(path.pathElements[0][0]) + BigInt(1)

            const circuitInputs = stringifyBigInts({
                path_elements: path.pathElements,
                path_index: path.indices,
                leaf: tree.leaves[index],
                root: tree.root,
            })

            try {
                await genWitness(circuit, circuitInputs)
            } catch {
                expect(true).toBeTruthy()
            }
        })
    })
 
    describe('QuinCheckRoot', () => {
        const circuit = 'quinTreeCheckRoot_test'

        it('Valid CheckRoot inputs should work', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 5, hash5)
            const leaves: BigInt[] = []

            for (let i = 0; i < 5 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                tree.insert(randomVal)
                leaves.push(randomVal)
            }

            const root = tree.root

            const circuitInputs = stringifyBigInts({ leaves })

            const witness = await genWitness(circuit, circuitInputs)
            const circuitRoot = await getSignalByName(circuit, witness, 'main.root')

            expect(circuitRoot).toEqual(root.toString())
        })

        it('Different leaves should generate a different root', async () => {
            const tree = new IncrementalQuinTree(LEVELS, ZERO_VALUE, 5, hash5)
            const leaves: BigInt[] = []

            for (let i = 0; i < 5 ** LEVELS; i++) {
                const randomVal = genRandomSalt()
                tree.insert(randomVal)
                leaves.push(randomVal)
            }

            leaves[0] = BigInt(0)

            const root = tree.root

            const circuitInputs = stringifyBigInts({ leaves })

            const witness = await genWitness(circuit, circuitInputs)
            const circuitRoot = await getSignalByName(circuit, witness, 'main.root')

            expect(circuitRoot).not.toEqual(root.toString())
        })
    })
})
