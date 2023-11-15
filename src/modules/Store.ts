import { atomWithStorage } from 'jotai/utils'

const idTokenAtom = atomWithStorage<string>("idToken", "")
const idEmailAtom = atomWithStorage<string>("idEmail", "")
const chatLoadedAtom = atomWithStorage<boolean>("chatLoaded", false)
export {
    idTokenAtom,
    idEmailAtom,
    chatLoadedAtom
}