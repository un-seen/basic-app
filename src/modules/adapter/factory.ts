const getWorker = () => {
    return new Worker(new URL('worker.ts', import.meta.url), {"type":"module"});
}

export default getWorker;
