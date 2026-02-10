#!/usr/bin/env python3
"""
Convert Spleeter pretrained models (2/4/5 stems) to ONNX format.

Requirements:
  pip install tensorflow torch onnx onnxmltools onnxruntime

Usage:
  python scripts/convert-spleeter-onnx.py --model 4stems
  python scripts/convert-spleeter-onnx.py --model 5stems
  python scripts/convert-spleeter-onnx.py --model 2stems

Output files are written to ./spleeter-onnx/{model}/ (e.g. ./spleeter-onnx/4stems/vocals.onnx)

After conversion, upload the .onnx files to HuggingFace:
  huggingface-cli upload your-username/sherpa-onnx-spleeter-4stems ./spleeter-onnx/4stems/
"""

import argparse
import os
import sys
import tarfile
import urllib.request

import numpy as np
import onnx
import torch
import torch.nn as nn
import torch.nn.functional as F

# ─── Model configs ───────────────────────────────────────────────────────────

CONFIGS = {
    "2stems": {
        "instruments": ["vocals", "accompaniment"],
        "activation": "leaky_relu",  # encoder: leaky_relu(0.2), decoder: relu
        "output_mode": "sigmoid",
        "url": "https://github.com/deezer/spleeter/releases/download/v1.4.0/2stems.tar.gz",
    },
    "4stems": {
        "instruments": ["vocals", "drums", "bass", "other"],
        "activation": "elu",  # both encoder and decoder use ELU
        "output_mode": "sigmoid",
        "url": "https://github.com/deezer/spleeter/releases/download/v1.4.0/4stems.tar.gz",
    },
    "5stems": {
        "instruments": ["vocals", "piano", "drums", "bass", "other"],
        "activation": "elu",
        "output_mode": "softmax",  # softmax across instruments
        "url": "https://github.com/deezer/spleeter/releases/download/v1.4.0/5stems.tar.gz",
    },
}

# ─── UNet Model ──────────────────────────────────────────────────────────────

class UNet(nn.Module):
    """Spleeter U-Net. Supports both LeakyReLU/ReLU (2stems) and ELU (4/5stems)."""

    def __init__(self, activation="leaky_relu", output_logit=False):
        super().__init__()
        self.activation = activation
        self.output_logit = output_logit

        # Encoder
        self.conv = nn.Conv2d(2, 16, kernel_size=5, stride=2, padding=0)
        self.bn = nn.BatchNorm2d(16, eps=1e-3, momentum=0.01)
        self.conv1 = nn.Conv2d(16, 32, kernel_size=5, stride=2, padding=0)
        self.bn1 = nn.BatchNorm2d(32, eps=1e-3, momentum=0.01)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=5, stride=2, padding=0)
        self.bn2 = nn.BatchNorm2d(64, eps=1e-3, momentum=0.01)
        self.conv3 = nn.Conv2d(64, 128, kernel_size=5, stride=2, padding=0)
        self.bn3 = nn.BatchNorm2d(128, eps=1e-3, momentum=0.01)
        self.conv4 = nn.Conv2d(128, 256, kernel_size=5, stride=2, padding=0)
        self.bn4 = nn.BatchNorm2d(256, eps=1e-3, momentum=0.01)
        self.conv5 = nn.Conv2d(256, 512, kernel_size=5, stride=2, padding=0)

        # Decoder
        self.up1 = nn.ConvTranspose2d(512, 256, kernel_size=5, stride=2)
        self.bn5 = nn.BatchNorm2d(256, eps=1e-3, momentum=0.01)
        self.up2 = nn.ConvTranspose2d(512, 128, kernel_size=5, stride=2)
        self.bn6 = nn.BatchNorm2d(128, eps=1e-3, momentum=0.01)
        self.up3 = nn.ConvTranspose2d(256, 64, kernel_size=5, stride=2)
        self.bn7 = nn.BatchNorm2d(64, eps=1e-3, momentum=0.01)
        self.up4 = nn.ConvTranspose2d(128, 32, kernel_size=5, stride=2)
        self.bn8 = nn.BatchNorm2d(32, eps=1e-3, momentum=0.01)
        self.up5 = nn.ConvTranspose2d(64, 16, kernel_size=5, stride=2)
        self.bn9 = nn.BatchNorm2d(16, eps=1e-3, momentum=0.01)
        self.up6 = nn.ConvTranspose2d(32, 1, kernel_size=5, stride=2)
        self.bn10 = nn.BatchNorm2d(1, eps=1e-3, momentum=0.01)

        # Output projection
        self.up7 = nn.Conv2d(1, 2, kernel_size=4, dilation=2, padding=3)

    def _enc_act(self, x):
        if self.activation == "elu":
            return F.elu(x)
        return F.leaky_relu(x, negative_slope=0.2)

    def _dec_act(self, x):
        if self.activation == "elu":
            return F.elu(x)
        return F.relu(x)

    def forward(self, x):
        """x: [2, num_splits, 512, 1024] → y: [2, num_splits, 512, 1024]"""
        x = x.permute(1, 0, 2, 3)  # [num_splits, 2, 512, 1024]
        in_x = x

        # Encoder
        x = F.pad(x, (1, 2, 1, 2))
        conv1 = self.conv(x)
        rel1 = self._enc_act(self.bn(conv1))

        x = F.pad(rel1, (1, 2, 1, 2))
        conv2 = self.conv1(x)
        rel2 = self._enc_act(self.bn1(conv2))

        x = F.pad(rel2, (1, 2, 1, 2))
        conv3 = self.conv2(x)
        rel3 = self._enc_act(self.bn2(conv3))

        x = F.pad(rel3, (1, 2, 1, 2))
        conv4 = self.conv3(x)
        rel4 = self._enc_act(self.bn3(conv4))

        x = F.pad(rel4, (1, 2, 1, 2))
        conv5 = self.conv4(x)
        rel6 = self._enc_act(self.bn4(conv5))

        x = F.pad(rel6, (1, 2, 1, 2))
        conv6 = self.conv5(x)

        # Decoder with skip connections
        up1 = self._dec_act(self.bn5(self.up1(conv6)[:, :, 1:-2, 1:-2]))
        up2 = self._dec_act(self.bn6(self.up2(torch.cat([conv5, up1], 1))[:, :, 1:-2, 1:-2]))
        up3 = self._dec_act(self.bn7(self.up3(torch.cat([conv4, up2], 1))[:, :, 1:-2, 1:-2]))
        up4 = self._dec_act(self.bn8(self.up4(torch.cat([conv3, up3], 1))[:, :, 1:-2, 1:-2]))
        up5 = self._dec_act(self.bn9(self.up5(torch.cat([conv2, up4], 1))[:, :, 1:-2, 1:-2]))
        up6 = self._dec_act(self.bn10(self.up6(torch.cat([conv1, up5], 1))[:, :, 1:-2, 1:-2]))

        up7 = self.up7(up6)

        if self.output_logit:
            # 5stems: return raw logits (softmax applied across instruments later)
            ans = up7 * in_x
        else:
            # 2stems/4stems: sigmoid mask
            ans = torch.sigmoid(up7) * in_x

        return ans.permute(1, 0, 2, 3)  # [2, num_splits, 512, 1024]


# ─── TF Checkpoint → PyTorch ─────────────────────────────────────────────────

def freeze_graph(model_dir, output_node_name, output_filename):
    """Freeze a TF checkpoint graph for a single instrument."""
    import tensorflow as tf

    checkpoint = tf.train.get_checkpoint_state(model_dir)
    input_checkpoint = checkpoint.model_checkpoint_path

    with tf.compat.v1.Session(graph=tf.Graph()) as sess:
        saver = tf.compat.v1.train.import_meta_graph(
            input_checkpoint + ".meta", clear_devices=True
        )
        saver.restore(sess, input_checkpoint)
        output_graph_def = tf.compat.v1.graph_util.convert_variables_to_constants(
            sess,
            tf.compat.v1.get_default_graph().as_graph_def(),
            output_node_name.split(","),
        )
        with tf.compat.v1.gfile.GFile(output_filename, "wb") as f:
            f.write(output_graph_def.SerializeToString())
    print(f"  Frozen graph: {len(output_graph_def.node)} ops -> {output_filename}")


def get_param(graph, name):
    """Extract a constant parameter from a frozen TF graph."""
    import tensorflow as tf

    with tf.compat.v1.Session(graph=graph) as sess:
        for op in sess.graph.get_operations():
            if op.type == "Const" and op.name == name:
                return torch.from_numpy(sess.run(op.outputs[0]))
    raise ValueError(f"Parameter not found: {name}")


def load_frozen_graph(filename):
    import tensorflow as tf

    with tf.compat.v1.gfile.GFile(filename, "rb") as f:
        graph_def = tf.compat.v1.GraphDef()
        graph_def.ParseFromString(f.read())
    with tf.Graph().as_default() as graph:
        tf.import_graph_def(graph_def, name="")
    return graph


def convert_weights(graph, unet, instrument_idx):
    """Load TF frozen graph weights into a PyTorch UNet.

    Each instrument occupies a fixed offset in TF's sequential op naming:
    - 7 Conv2d ops per instrument (6 encoder + 1 output)
    - 6 ConvTranspose2d ops per instrument
    - 12 BatchNorm ops per instrument (5 encoder + 1 first + 6 decoder...
      actually the pattern from sherpa-onnx is:
      first instrument uses offsets 0/0, second uses 7/12)
    """
    conv_offset = instrument_idx * 7
    bn_offset = instrument_idx * 12
    transpose_offset = instrument_idx * 6

    state_dict = unet.state_dict()

    # First encoder conv + bn
    if instrument_idx == 0:
        conv_name = "conv2d"
        bn_name = "batch_normalization"
    else:
        conv_name = f"conv2d_{conv_offset}"
        bn_name = f"batch_normalization_{bn_offset}"

    state_dict["conv.weight"] = get_param(graph, f"{conv_name}/kernel").permute(3, 2, 0, 1)
    state_dict["conv.bias"] = get_param(graph, f"{conv_name}/bias")
    state_dict["bn.weight"] = get_param(graph, f"{bn_name}/gamma")
    state_dict["bn.bias"] = get_param(graph, f"{bn_name}/beta")
    state_dict["bn.running_mean"] = get_param(graph, f"{bn_name}/moving_mean")
    state_dict["bn.running_var"] = get_param(graph, f"{bn_name}/moving_variance")

    # Encoder convs 1-5
    for i in range(1, 6):
        c_idx = conv_offset + i
        state_dict[f"conv{i}.weight"] = get_param(graph, f"conv2d_{c_idx}/kernel").permute(3, 2, 0, 1)
        state_dict[f"conv{i}.bias"] = get_param(graph, f"conv2d_{c_idx}/bias")
        if i < 5:
            b_idx = bn_offset + i
            state_dict[f"bn{i}.weight"] = get_param(graph, f"batch_normalization_{b_idx}/gamma")
            state_dict[f"bn{i}.bias"] = get_param(graph, f"batch_normalization_{b_idx}/beta")
            state_dict[f"bn{i}.running_mean"] = get_param(graph, f"batch_normalization_{b_idx}/moving_mean")
            state_dict[f"bn{i}.running_var"] = get_param(graph, f"batch_normalization_{b_idx}/moving_variance")

    # Decoder transpose convs and batch norms
    if instrument_idx == 0:
        t_name = "conv2d_transpose"
    else:
        t_name = f"conv2d_transpose_{transpose_offset}"

    state_dict["up1.weight"] = get_param(graph, f"{t_name}/kernel").permute(3, 2, 0, 1)
    state_dict["up1.bias"] = get_param(graph, f"{t_name}/bias")

    bn5_idx = bn_offset + 5 + 1  # skip one (pattern from sherpa-onnx: encoder uses 0-4, then 6+ for decoder)
    state_dict["bn5.weight"] = get_param(graph, f"batch_normalization_{bn5_idx}/gamma")
    state_dict["bn5.bias"] = get_param(graph, f"batch_normalization_{bn5_idx}/beta")
    state_dict["bn5.running_mean"] = get_param(graph, f"batch_normalization_{bn5_idx}/moving_mean")
    state_dict["bn5.running_var"] = get_param(graph, f"batch_normalization_{bn5_idx}/moving_variance")

    for i in range(1, 6):
        t_idx = transpose_offset + i
        state_dict[f"up{i+1}.weight"] = get_param(graph, f"conv2d_transpose_{t_idx}/kernel").permute(3, 2, 0, 1)
        state_dict[f"up{i+1}.bias"] = get_param(graph, f"conv2d_transpose_{t_idx}/bias")
        b_idx = bn5_idx + i
        state_dict[f"bn{5+i}.weight"] = get_param(graph, f"batch_normalization_{b_idx}/gamma")
        state_dict[f"bn{5+i}.bias"] = get_param(graph, f"batch_normalization_{b_idx}/beta")
        state_dict[f"bn{5+i}.running_mean"] = get_param(graph, f"batch_normalization_{b_idx}/moving_mean")
        state_dict[f"bn{5+i}.running_var"] = get_param(graph, f"batch_normalization_{b_idx}/moving_variance")

    # Output conv
    final_conv_idx = conv_offset + 6
    state_dict["up7.weight"] = get_param(graph, f"conv2d_{final_conv_idx}/kernel").permute(3, 2, 0, 1)
    state_dict["up7.bias"] = get_param(graph, f"conv2d_{final_conv_idx}/bias")

    unet.load_state_dict(state_dict)
    return unet


# ─── ONNX Export ─────────────────────────────────────────────────────────────

def export_to_onnx(model, output_path, model_name, stem_name, num_stems):
    """Export a PyTorch UNet to ONNX format."""
    x = torch.rand(2, 1, 512, 1024, dtype=torch.float32)

    torch.onnx.export(
        model, x, output_path,
        input_names=["x"],
        output_names=["y"],
        dynamic_axes={"x": {1: "num_splits"}},
        opset_version=13,
    )

    # Add metadata
    onnx_model = onnx.load(output_path)
    while len(onnx_model.metadata_props):
        onnx_model.metadata_props.pop()

    for key, value in {
        "model_type": "spleeter",
        "sample_rate": "44100",
        "version": "1",
        "stems": str(num_stems),
        "stem_name": stem_name,
        "model_name": f"{model_name}.tar.gz",
    }.items():
        meta = onnx_model.metadata_props.add()
        meta.key = key
        meta.value = value

    onnx.save(onnx_model, output_path)
    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f"  Exported: {output_path} ({size_mb:.1f} MB)")


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Convert Spleeter models to ONNX")
    parser.add_argument("--model", choices=["2stems", "4stems", "5stems"], required=True)
    parser.add_argument("--output", default=None, help="Output directory (default: ./spleeter-onnx/{model}/)")
    args = parser.parse_args()

    config = CONFIGS[args.model]
    instruments = config["instruments"]
    output_dir = args.output or f"./spleeter-onnx/{args.model}"
    os.makedirs(output_dir, exist_ok=True)

    tar_name = f"{args.model}.tar.gz"
    extract_dir = f"./{args.model}"

    # Step 1: Download pretrained model
    if not os.path.exists(tar_name):
        print(f"Downloading {tar_name}...")
        urllib.request.urlretrieve(config["url"], tar_name)
    else:
        print(f"Using cached {tar_name}")

    # Step 2: Extract
    if not os.path.exists(extract_dir):
        print(f"Extracting {tar_name}...")
        os.makedirs(extract_dir, exist_ok=True)
        with tarfile.open(tar_name) as tar:
            tar.extractall(extract_dir)

    # Step 3: Freeze graphs and convert each instrument
    print(f"\nConverting {args.model} ({len(instruments)} instruments)...")

    # Build output node names for freezing
    output_nodes = ",".join(f"{inst}_spectrogram/mul" for inst in instruments)

    # Freeze the full graph once (contains all instruments)
    frozen_path = os.path.join(extract_dir, "frozen_model.pb")
    if not os.path.exists(frozen_path):
        print("  Freezing TF graph...")
        freeze_graph(extract_dir, output_nodes, frozen_path)

    graph = load_frozen_graph(frozen_path)

    output_mode = config["output_mode"]
    is_logit = output_mode == "softmax"

    for idx, instrument in enumerate(instruments):
        print(f"\n  [{idx+1}/{len(instruments)}] Converting {instrument}...")

        unet = UNet(activation=config["activation"], output_logit=is_logit)
        unet.eval()

        try:
            unet = convert_weights(graph, unet, idx)
        except ValueError as e:
            print(f"  ERROR: {e}")
            print(f"  The TF variable naming may differ for {args.model}.")
            print(f"  You may need to inspect the frozen graph and adjust offsets.")
            sys.exit(1)

        output_path = os.path.join(output_dir, f"{instrument}.onnx")
        with torch.no_grad():
            export_to_onnx(unet, output_path, args.model, instrument, len(instruments))

    print(f"\nDone! ONNX models saved to {output_dir}/")
    print(f"\nTo use in Keplear, upload to HuggingFace:")
    print(f"  pip install huggingface_hub")
    print(f"  huggingface-cli upload YOUR_USERNAME/sherpa-onnx-spleeter-{args.model} {output_dir}/")
    print(f"\nThen update the HF_BASE_URLS in stemSeparation.worker.ts")


if __name__ == "__main__":
    main()
