import * as jotai from 'jotai'

const SIGNAL_RESET = jotai.atom<boolean>(false)

export {
    SIGNAL_RESET
}