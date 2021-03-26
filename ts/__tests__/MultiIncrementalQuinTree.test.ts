import * as assert from 'assert'
const ff = require('ffjavascript')

import {
    IncrementalQuinTree,
    MultiIncrementalQuinTree,
} from '../IncrementalQuinTree'
import { hash5, genRandomSalt, stringifyBigInts } from './utils'

const ZERO_VALUE = BigInt(0)
const DEPTH = 4
const LEAVES_PER_NODE = 5

const computeEmptyRoot = (
    depth: number,
    zeroValue: BigInt,
): BigInt => {
    assert(depth > 0)
    const zeros: BigInt[] = []
    zeros.push(zeroValue)

    for (let i = 1; i < depth; i ++) {
        const node: BigInt[] = []
        for (let j = 0; j < LEAVES_PER_NODE; j ++) {
            node.push(zeros[i-1])
        }
        zeros.push(hash5(node))
    }

    const n: BigInt[] = []
    for (let i = 0; i < LEAVES_PER_NODE; i ++) {
        n.push(zeros[depth - 1])
    }

    return hash5(n)
}

const computeRootFromLeaves = (
    leaves: BigInt[],
): BigInt => {
    if (leaves.length === 1) {
        return leaves[0]
    }

    assert(leaves.length % LEAVES_PER_NODE === 0)

    const hashes: BigInt[] = []
    for (let i = 0; i < leaves.length / LEAVES_PER_NODE; i ++) {
        const r: BigInt[] = []
        for (let j = 0; j < LEAVES_PER_NODE; j ++) {
            r.push(leaves[i * LEAVES_PER_NODE + j])
        }
        hashes.push(hash5(r))
    }
    return computeRootFromLeaves(hashes)
}

describe('Multiple Quin Merkle Tree', () => {

    it('the constructor should calculate the correct empty root', () => {
        const tree = new MultiIncrementalQuinTree(DEPTH, ZERO_VALUE, LEAVES_PER_NODE, hash5)
        expect(computeEmptyRoot(DEPTH, ZERO_VALUE).toString())
            .toEqual(tree.roots[0].toString())

        const leaves: BigInt[] = []
        for (let i = 0; i < LEAVES_PER_NODE ** DEPTH; i ++) {
            leaves.push(ZERO_VALUE)
        }
        expect(computeRootFromLeaves(leaves).toString())
            .toEqual(tree.roots[0].toString())
    })

    it('insert() should calculate a correct root', () => {
        const depth = 2
        const tree = new MultiIncrementalQuinTree(2, ZERO_VALUE, LEAVES_PER_NODE, hash5)
        const numToInsert = 4
        const leaves: BigInt[] = []
        for (let i = 0; i < numToInsert; i ++) {
            const leaf = BigInt(i + 1)
            leaves.push(leaf)
            tree.insert(leaf)
        }

        for (let i = leaves.length; i < LEAVES_PER_NODE ** depth; i ++) {
            leaves.push(ZERO_VALUE)
        }

        expect(computeRootFromLeaves(leaves).toString())
            .toEqual(tree.roots[0].toString())

        expect(tree.leaves.length).toEqual(numToInsert)
    })

    it('insert enough to create 2 trees', () => {
        const numTrees = 2
        const depth = 2
        const tree = new MultiIncrementalQuinTree(2, ZERO_VALUE, LEAVES_PER_NODE, hash5)
        const numToInsert = numTrees * (LEAVES_PER_NODE ** depth)
        const leaves: BigInt[] = []

        for (let i = 0; i < numToInsert; i ++) {
            const leaf = BigInt(i + 1)
            leaves.push(leaf)
            tree.insert(leaf)
        }

        expect(computeRootFromLeaves(leaves.slice(0, numToInsert / 2)).toString())
            .toEqual(tree.roots[0].toString())

        expect(computeRootFromLeaves(leaves.slice(numToInsert / 2)).toString())
            .toEqual(tree.roots[1].toString())

        expect(tree.leaves.length).toEqual(numToInsert)
        expect(tree.roots.length).toEqual(numTrees)
    })

    it('update() should calculate a correct root', () => {
        const depth = 2
        const tree = new MultiIncrementalQuinTree(depth, ZERO_VALUE, LEAVES_PER_NODE, hash5)
        const numToInsert = LEAVES_PER_NODE * 2
        const leaves: BigInt[] = []
        for (let i = 0; i < numToInsert; i ++) {
            const leaf = BigInt(i + 1)
            leaves.push(leaf)
            tree.insert(leaf)
        }

        for (let i = leaves.length; i < LEAVES_PER_NODE ** depth; i ++) {
            leaves.push(ZERO_VALUE)
        }

        const newLeaf = BigInt(6)
        leaves[0] = newLeaf
        tree.update(0, newLeaf)
        expect(computeRootFromLeaves(leaves).toString())
            .toEqual(tree.roots[0].toString())
    })

    it('copy() should produce a deep copy', () => {
        const tree = new MultiIncrementalQuinTree(DEPTH, ZERO_VALUE, LEAVES_PER_NODE, hash5)
        const numToInsert = LEAVES_PER_NODE * 2
        for (let i = 0; i < numToInsert; i ++) {
            const leaf = BigInt(i + 1)
            tree.insert(leaf)
        }

        const newTree = tree.copy()
        const leaf = genRandomSalt()
        tree.insert(leaf)
        newTree.insert(leaf)
        expect(tree.roots[0].toString()).toEqual(newTree.roots[0].toString())

        tree.update(0, leaf)
        newTree.update(0, leaf)
        expect(tree.roots[0].toString()).toEqual(newTree.roots[0].toString())

        const path1 = tree.genMerklePath(2)
        const path2 = newTree.genMerklePath(2)
        expect(JSON.stringify(stringifyBigInts(path1))).toEqual(JSON.stringify(stringifyBigInts(path2)))
    })

    describe('Tree with 4 leaves per node', () => {
        it ('should throw', () => {
            expect(() => {
                new MultiIncrementalQuinTree(DEPTH, ZERO_VALUE, 4, hash5)
            }).toThrow()
        })
        //// TODO: not supported yet
        //it ('should compute the correct root', () => {
            //const tree = new MultiIncrementalQuinTree(DEPTH, ZERO_VALUE, 4)
            //for (let i = 0; i < 6; i ++) {
                //tree.insert(i)
            //}
            //const leaves = [0, 1, 2, 3, 0, 4, 5]
            //for (let i = leaves.length; i < 5 ** DEPTH; i ++) {
                //leaves.push(ZERO_VALUE)
            //}
            //expect(tree.root.toString()).toEqual(computeRootFromLeaves(leaves).toString())
        //})
    })

    describe('Path generation and verification', () => {
        let tree
        const numToInsert = 5 ** DEPTH

        beforeAll(() => {
            tree = new IncrementalQuinTree(DEPTH, ZERO_VALUE, LEAVES_PER_NODE, hash5)
            for (let i = 0; i < numToInsert; i ++) {
                const leaf = BigInt(i + 1)
                tree.insert(leaf)
            }
        })

        it('genMerklePath() should fail if the index is invalid', () => {
            expect(() => {
                tree.genMerklePath(numToInsert)
            }).toThrow()
        })

        it('verifyMerklePath() should reject an invalid proof (with the right format)', () => {
            const path = tree.genMerklePath(numToInsert - 1)
            path.pathElements[0][0] = BigInt(123)
            const isValid = IncrementalQuinTree.verifyMerklePath(
                path,
                tree.hashFunc,
            )

            expect(isValid).toBeFalsy()
        })

        it('verifyMerklePath() should reject an invalid proof (with the wrong format)', () => {
            const path = tree.genMerklePath(numToInsert - 1)
            path.pathElements[0] = null
            expect(() => {
                IncrementalQuinTree.verifyMerklePath(
                    path,
                    tree.hashFunc,
                )
            }).toThrow()
        })

        it('genMerklePath() should calculate a correct Merkle path', () => {

            const path = tree.genMerklePath(30)

            const isValid = IncrementalQuinTree.verifyMerklePath(
                path,
                tree.hashFunc,
            )

            expect(isValid).toBeTruthy()
        })

        it('genMerklePath() should calculate a correct Merkle path for the second tree', () => {
            const depth = 3
            const numTrees = 2
            const numToInsert = numTrees * (LEAVES_PER_NODE ** depth)
            const tree = new IncrementalQuinTree(depth, ZERO_VALUE, LEAVES_PER_NODE, hash5)

            for (let i = 0; i < numToInsert; i ++) {
                tree.insert(genRandomSalt())
            }

            const path = tree.genMerklePath((numToInsert / 2) + 1)
            const isValid = IncrementalQuinTree.verifyMerklePath(
                path,
                tree.hashFunc,
            )

            expect(isValid).toBeTruthy()
        })

        it('genMerklePath() should calculate a correct Merkle path for each most recently inserted leaf', () => {
            const tree = new IncrementalQuinTree(DEPTH, ZERO_VALUE, LEAVES_PER_NODE, hash5)
            const numToInsert = LEAVES_PER_NODE * 2

            expect.assertions(numToInsert)
            for (let i = 0; i < numToInsert; i ++) {
                const leaf = BigInt(i + 1)
                tree.insert(leaf)

                const path = tree.genMerklePath(i)
                const isValid = IncrementalQuinTree.verifyMerklePath(
                    path,
                    tree.hashFunc,
                )
        
                expect(isValid).toBeTruthy()
            }
        })
    })
    
    describe('Subroot path generation and verification', () => {
        let tree
        const numToInsert = 5 ** DEPTH

        beforeAll(() => {
            tree = new IncrementalQuinTree(DEPTH, ZERO_VALUE, LEAVES_PER_NODE, hash5)
            for (let i = 0; i < numToInsert; i ++) {
                const leaf = BigInt(i + 1)
                tree.insert(leaf)
            }
        })

        it('genMerkleSubrootPath() should calculate a correct Merkle path to a subroot', () => {
            const tree = new IncrementalQuinTree(4, 0, 5, hash5)
            const subTree = new IncrementalQuinTree(2, 0, 5, hash5)
            for (let i = 0; i < 5 ** 2; i++) {
                tree.insert(BigInt(i))
                subTree.insert(BigInt(i))
            }

            const subrootPath = tree.genMerkleSubrootPath(0, 5)
            const isValid = IncrementalQuinTree.verifyMerklePath(
                subrootPath,
                tree.hashFunc,
            )
            expect(isValid).toBeTruthy()
        })

        it('ggenMerkleSubrootPath() should calculate a correct Merkle path for the second tree', () => {
            const depth = 3
            const numTrees = 2
            const numToInsert = numTrees * (LEAVES_PER_NODE ** depth)
            const tree = new IncrementalQuinTree(depth, ZERO_VALUE, LEAVES_PER_NODE, hash5)

            for (let i = 0; i < numToInsert; i ++) {
                tree.insert(genRandomSalt())
            }

            const subrootPath = tree.genMerkleSubrootPath(
                (numToInsert / 2) + LEAVES_PER_NODE,
                (numToInsert / 2) + (2 * LEAVES_PER_NODE),
            )
            const isValid = IncrementalQuinTree.verifyMerklePath(
                subrootPath,
                tree.hashFunc,
            )
            expect(isValid).toBeTruthy()

            expect(() => {
                tree.genMerkleSubrootPath(
                    (numToInsert / 2) - LEAVES_PER_NODE,
                    (numToInsert / 2) + LEAVES_PER_NODE,
                )
            }).toThrow()
        })

        it('genMerkleSubrootPath() should calculate a correct Merkle path to a subroot (2)', () => {
            const tree = new IncrementalQuinTree(5, 0, 5, hash5)
            const subTree = new IncrementalQuinTree(3, 0, 5, hash5)
            for (let i = 0; i < 5 ** 3; i++) {
                tree.insert(BigInt(i))
                subTree.insert(BigInt(i))
            }

            const subrootPath = tree.genMerkleSubrootPath(25, 50)
            const isValid = IncrementalQuinTree.verifyMerklePath(
                subrootPath,
                tree.hashFunc,
            )
            expect(subrootPath.depth).toEqual(3)
            expect(isValid).toBeTruthy()
        })
    })
})
