import ChainMultiselect, { CHAIN_MULTISELECT_BG } from "@/components/ChainMultiselect";

export default function MultiselectPage() {
  return (
    <main
      className="flex min-h-screen items-start justify-center px-4 pt-[34vh] font-sans font-normal"
      style={{ background: CHAIN_MULTISELECT_BG }}
    >
      <ChainMultiselect />
    </main>
  );
}
