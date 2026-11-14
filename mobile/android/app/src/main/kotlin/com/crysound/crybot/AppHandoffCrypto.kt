package com.crysound.crybot

import java.math.BigInteger
import java.security.AlgorithmParameters
import java.security.KeyFactory
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.interfaces.ECPublicKey
import java.security.spec.ECFieldFp
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.ECPoint
import java.security.spec.ECPublicKeySpec
import java.security.spec.PKCS8EncodedKeySpec
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

internal object AppHandoffCrypto {
    fun encode(bytes: ByteArray): String = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)

    private fun decode(value: String): ByteArray {
        require(Regex("^[A-Za-z0-9_-]+$").matches(value))
        val bytes = Base64.getUrlDecoder().decode(value)
        require(encode(bytes) == value)
        return bytes
    }

    fun generateKeyPair(): KeyPair = KeyPairGenerator.getInstance("EC").apply {
        initialize(ECGenParameterSpec("secp256r1"))
    }.generateKeyPair()

    private fun coordinate(value: BigInteger): ByteArray {
        require(value.signum() >= 0 && value.bitLength() <= 256)
        val bytes = value.toByteArray()
        val magnitude = if (bytes.size == 33) bytes.copyOfRange(1, 33) else bytes
        return ByteArray(32 - magnitude.size) + magnitude
    }

    fun publicKey(key: ECPublicKey): String = encode(byteArrayOf(4) + coordinate(key.w.affineX) + coordinate(key.w.affineY))

    private fun publicKey(bytes: ByteArray): ECPublicKey {
        require(bytes.size == 65 && bytes[0] == 4.toByte())
        val parameters = AlgorithmParameters.getInstance("EC").apply { init(ECGenParameterSpec("secp256r1")) }
            .getParameterSpec(ECParameterSpec::class.java)
        val x = BigInteger(1, bytes.copyOfRange(1, 33))
        val y = BigInteger(1, bytes.copyOfRange(33, 65))
        val curve = parameters.curve
        val prime = (curve.field as ECFieldFp).p
        require(x < prime && y < prime)
        require(y.multiply(y).mod(prime) == x.pow(3).add(curve.a.multiply(x)).add(curve.b).mod(prime))
        return KeyFactory.getInstance("EC").generatePublic(ECPublicKeySpec(ECPoint(x, y), parameters)) as ECPublicKey
    }

    private fun hmac(key: ByteArray, input: ByteArray): ByteArray = Mac.getInstance("HmacSHA256").run {
        init(SecretKeySpec(key, "HmacSHA256"))
        doFinal(input)
    }

    fun decrypt(privateKey: String, state: String, epk: String, iv: String, ct: String): String {
        val key = KeyFactory.getInstance("EC").generatePrivate(PKCS8EncodedKeySpec(decode(privateKey)))
        val secret = KeyAgreement.getInstance("ECDH").run {
            init(key)
            doPhase(publicKey(decode(epk)), true)
            generateSecret()
        }
        val stateBytes = state.toByteArray(Charsets.UTF_8)
        val extracted = hmac(stateBytes, secret)
        val aesKey = hmac(extracted, "crybot-app-handoff-v1".toByteArray(Charsets.UTF_8) + byteArrayOf(1))
        val nonce = decode(iv)
        val ciphertext = decode(ct)
        require(nonce.size == 12 && ciphertext.size > 16)
        val plaintext = Cipher.getInstance("AES/GCM/NoPadding").run {
            init(Cipher.DECRYPT_MODE, SecretKeySpec(aesKey, "AES"), GCMParameterSpec(128, nonce))
            updateAAD(stateBytes)
            doFinal(ciphertext)
        }
        return String(plaintext, Charsets.UTF_8)
    }
}
