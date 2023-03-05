import { useState, useEffect } from "react";
import { NFTStorage, File } from "nft.storage";
import { Buffer } from "buffer";
import { ethers } from "ethers";
import axios from "axios";

// Components
import Spinner from "react-bootstrap/Spinner";
import Navigation from "./components/Navigation";

// ABIs
import NFT from "./abis/NFT.json";

// Config
import config from "./config.json";

function App() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [nft, setNFT] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [url, setURL] = useState(null);

  const [message, setMessage] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(provider);

    const network = await provider.getNetwork();

    const nft = new ethers.Contract(
      config[network.chainId].nft.address,
      NFT,
      provider
    );
    setNFT(nft);
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (name === "" || description === "") {
      window.alert("Please provide a name and description");
      return;
    }

    setIsWaiting(true);

    // Call AI API to generate a image based on description
    const imageData = await createImage();

    // Upload image to IPFS (NFT.Storage)
    const url = await uploadImage(imageData);

    // Mint NFT
    await mintImage(url);

    setIsWaiting(false);
    setMessage("");
  };

  const createImage = async () => {
    setMessage("Generating Image...");

    const prompt = description;
    const API_KEY = "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";
    const URL = "https://api.openai.com/v1/images/generations";

    const response = await axios({
      method: "POST",
      url: URL,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      data: {
        model: "image-alpha-001",
        prompt: prompt,
        num_images: 1,
        size: "1024x1024",
        response_format: "url",
        noise_prompt_seed: 42,
        noise_prompt_weight: 0.5,
        truncation: 1.0,
        seed: null,
      },
    });

    const imgURL = response.data.data[0].url;
    setImage(imgURL);

    /*
    // You can replace this with different model API's
    const URL = `https://api-inference.huggingface.co/models/CompVis/stable-diffusion-v1-4`;

    // Send the request
    const response = await axios({
      url: URL,
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_HUGGING_FACE_API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        inputs: description,
        options: { wait_for_model: true },
      }),
      responseType: "arraybuffer",
    });

    const type = response.headers["content-type"];
    const data = response.data;

    const base64data = Buffer.from(data).toString("base64");
    const img = `data:${type};base64,` + base64data; // <-- This is so we can render it on the page
    setImage(img);

    return data;
   */
  };

  const uploadImage = async (imageData) => {
    setMessage("Uploading Image...");

    // Create instance to NFT.Storage
    const nftstorage = new NFTStorage({
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDEzQThBMUVmYmEwN2M4NjA1YWE4NDkzMjJDMGM4REM4YTRhOWMzODQiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY3ODAyOTY3NDQxMiwibmFtZSI6Ik5GVF9Cb3QifQ.ytwVE967YYheQQ7Wz6kbohTrA-IuZO9FFW_1XoMR81Y",
    });

    // Send request to store image
    const { ipnft } = await nftstorage.store({
      image: new File([imageData], "image.jpeg", { type: "image/jpeg" }),
      name: name,
      description: description,
    });

    // Save the URL
    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.json`;
    setURL(url);

    return url;
  };

  const mintImage = async (tokenURI) => {
    setMessage("Waiting for Mint...");

    const signer = await provider.getSigner();
    const transaction = await nft
      .connect(signer)
      .mint(tokenURI, { value: ethers.utils.parseUnits("1", "ether") });
    await transaction.wait();
  };

  useEffect(() => {
    loadBlockchainData();
  }, []);

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />

      <div className="form">
        <form onSubmit={submitHandler}>
          <input
            type="text"
            placeholder="Create a name..."
            onChange={(e) => {
              setName(e.target.value);
            }}
          />
          <input
            type="text"
            placeholder="Create a description..."
            onChange={(e) => setDescription(e.target.value)}
          />
          <input type="submit" value="Create & Mint" />
        </form>

        <div className="image">
          {!isWaiting && image ? (
            <img src={image} alt="AI generated image" />
          ) : isWaiting ? (
            <div className="image__placeholder">
              <Spinner animation="border" />
              <p>{message}</p>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>

      {!isWaiting && url && (
        <p>
          View&nbsp;
          <a href={url} target="_blank" rel="noreferrer">
            Metadata
          </a>
        </p>
      )}
    </div>
  );
}

export default App;
