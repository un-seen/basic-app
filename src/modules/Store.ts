import { atomWithStorage } from 'jotai/utils'

const idTokenAtom = atomWithStorage<string>("idToken", "")
const idEmailAtom = atomWithStorage<string>("idEmail", "")

export {
    idTokenAtom,
    idEmailAtom
}