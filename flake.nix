{
  description = "vim-flow-ts: TypeScript comparison for the Vim game experiment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    claude-code-nix.url = "github:sadjow/claude-code-nix";
    codex-cli-nix.url = "github:sadjow/codex-cli-nix";
    ploopy = {
      url = "github:Torwalt/ploopy";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.claude-code-nix.follows = "claude-code-nix";
    };
    benchpress = {
      url = "github:Torwalt/benchpress";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.claude-code-nix.follows = "claude-code-nix";
      inputs.ploopy.follows = "ploopy";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      claude-code-nix,
      codex-cli-nix,
      ploopy,
      benchpress,
    }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.stdenvNoCC.mkDerivation {
            pname = "vim-flow-ts-web";
            version = "0.0.0";
            src = self;
            nativeBuildInputs = [ pkgs.bun ];
            dontConfigure = true;
            buildPhase = ''
              runHook preBuild
              bun build index.html --target browser --outdir dist
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p $out
              cp -r dist/. $out/
              runHook postInstall
            '';
          };
        }
      );

      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.bun
              pkgs.typescript
              pkgs.clang
              pkgs.just
              pkgs.direnv
              pkgs.tmux
              pkgs.git
              pkgs.gh
              pkgs.ripgrep
              pkgs.jq
              pkgs.nixfmt
              claude-code-nix.packages.${system}.claude-code
              codex-cli-nix.packages.${system}.default
              ploopy.packages.${system}.ploopy
              ploopy.packages.${system}.opencode
              benchpress.packages.${system}.benchpress
            ]
            ++ pkgs.lib.optional pkgs.stdenv.hostPlatform.isLinux pkgs.chromium;

            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
            PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH =
              if pkgs.stdenv.hostPlatform.isLinux then "${pkgs.chromium}/bin/chromium" else "";
          };
        }
      );

      checks = forAllSystems (system: {
        web = self.packages.${system}.default;
      });

      formatter = forAllSystems (system: nixpkgs.legacyPackages.${system}.nixfmt);
    };
}
