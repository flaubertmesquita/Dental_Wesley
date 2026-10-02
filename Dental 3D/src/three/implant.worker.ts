import { buildImplantData, type ImplantBuildOptions } from "./implantMesh";

type WorkerScope = {
  onmessage: ((e: MessageEvent<ImplantBuildOptions>) => void) | null;
  postMessage: (message: unknown, transfer: Transferable[]) => void;
};

const scope = self as unknown as WorkerScope;

scope.onmessage = (e) => {
  const data = buildImplantData(e.data);
  const transfer: Transferable[] = [];
  for (const m of [data.crown, data.fixture]) {
    transfer.push(
      m.positions.buffer as ArrayBuffer,
      m.normals.buffer as ArrayBuffer,
      m.colors.buffer as ArrayBuffer,
      m.index.buffer as ArrayBuffer
    );
    if (m.crest) transfer.push(m.crest.buffer as ArrayBuffer);
  }
  transfer.push(data.crownSparkles.buffer as ArrayBuffer, data.fixtureSparkles.buffer as ArrayBuffer);
  scope.postMessage(data, transfer);
};
