import React, { useState, useEffect } from "react";
import url from "url";
import {
  Box,
  Typography,
  Dialog,
  Snackbar,
  Alert,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function AddAccounts({ open, onClose }) {
  const { t } = useTranslation();
  const [alert, setAlert] = useState({ message: "", severity: "" });
  const [unstoredTokens, setUnstoredTokens] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/smswithoutborders/SMSWithoutBorders-Publisher/staging/resources/platforms.json"
        );
        const data = await response.json();
        setUnstoredTokens(data);
      } catch (error) {
        console.error("Failed to fetch token data:", error);
      }
    };

    fetchTokens();
  }, []);

  const handleAlertClose = () => {
    setAlert({ ...alert, open: false });
  };

  const handleClose = () => {
    onClose();
  };

  const handleAddAccount = async (platform) => {
    try {
      const response = await window.api.getOAuth2AuthorizationUrl(
        platform,
        "",
        "",
        true
      );
      await window.api.storeParams("code", response.code_verifier);

      const parsedAuthUrl = new URL(response.authorization_url);
      const parsedRedirecthUrl = new URL(response.redirect_url);
      const newRedirectUri = url.resolve(
        "http://localhost:18000",
        parsedRedirecthUrl.pathname
      );
      parsedAuthUrl.searchParams.set("redirect_uri", newRedirectUri);

      const auth_code = await window.api.openOauth({
        oauthUrl: parsedAuthUrl.toString(),
        expectedRedirect: newRedirectUri,
      });

      const longLivedToken = await window.api.retrieveParams("longLivedToken");
      const serverDevicePublicId = await window.api.retrieveParams(
        "serverDeviceId"
      );
      const clientDeviceSecretId = await window.api.retrieveParams(
        "client_device_id_key_pair"
      );

      const llt = await window.api.retrieveLongLivedToken({
        client_device_id_secret_key: clientDeviceSecretId.secretKey,
        server_device_id_pub_key: serverDevicePublicId,
        long_lived_token_cipher: longLivedToken,
      });

      const store = await window.api.exchangeOAuth2CodeAndStore(
        llt,
        platform,
        auth_code,
        response.code_verifier
      );
      console.log(store);
      setAlert({
        message: "Token stored successfully",
        severity: "success",
        open: true,
      });

      setTimeout(() => {
        navigate("/onboarding4");
        handleClose();
      }, 2000);
    } catch (error) {
      console.error("Failed to get OAuth2 authorization URL:", error);
      setAlert({
        message: error.message,
        severity: "success",
        open: true,
      });
    }
  };

  return (
    <>
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleAlertClose}
      >
        <Alert
          onClose={handleAlertClose}
          severity={alert.severity}
          sx={{ width: "100%" }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
      <Popover
        elevation={4}
        anchor="bottom"
        open={open}
        onClose={onClose}
        sx={{ my: 3, mx: 5 }}
      >
        <Box sx={{ py: 8, px: 5 }}>
          <Typography variant="h6">{t("Add Accounts")}</Typography>
          <Typography sx={{ pt: 2 }} variant="body1">
            {t("Adding accounts blah blah blah")}
          </Typography>

          {unstoredTokens.map((token, index) => (
            <List key={index}>
              <ListItem
                button
                onClick={() => handleAddAccount(token.name)}
                sx={{ display: "flex", alignItems: "center" }}
              >
                <ListItemAvatar>
                  <Box
                    component="img"
                    src={token.icon_svg}
                    alt={token.name}
                    sx={{ width: "40px", height: "40px", marginRight: 2 }}
                  />
                </ListItemAvatar>
                <ListItemText>
                  <Typography variant="body2">{token.name}</Typography>
                </ListItemText>
              </ListItem>
            </List>
          ))}
        </Box>
      </Popover>
    </>
  );
}
