import Foundation
import XCTest
import CryRFB

final class RFBHandshakeTests: XCTestCase {
    func testNoneHandshakeForAllVersionsAndFragmentation() throws {
        for version in [3, 7, 8] {
            for bytewise in [false, true] {
                let client = RFBClient(inflater: StoredBlockInflater())
                let output = RFBFixture.feed(RFBFixture.handshake(version: version), to: client, bytewise: bytewise)
                var expected = [Data("RFB 003.00\(version)\n".utf8)]
                if version != 3 { expected.append(Data([1])) }
                expected += [Data([1]), Data([0, 0, 0, 0, 32, 24, 0, 1, 0, 255, 0, 255, 0, 255, 16, 8, 0, 0, 0, 0]),
                             Data([2, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 16,
                                   255, 255, 255, 33, 255, 255, 255, 17]),
                             Data([3, 0, 0, 0, 0, 0, 0, 3, 0, 2])]
                XCTAssertEqual(RFBFixture.sent(output), expected)
                XCTAssertEqual(client.state, .connected)
                XCTAssertEqual(client.serverInfo?.name, "Example Desktop")
                XCTAssertEqual(client.serverInfo?.width, 3)
                XCTAssertEqual(client.serverInfo?.height, 2)
                XCTAssertEqual(RFBFixture.events(output).count, 1)
                XCTAssertEqual(client.framebuffer?.pixels, Array(repeating: [0, 0, 0, 255], count: 6).flatMap { $0 })
            }
        }
    }

    func testVNCAcrossVersionsReversesBitsTruncatesPasswordAndEncryptsOnce() {
        for version in [3, 7, 8] {
            for bytewise in [false, true] {
                let des = RecordingDES()
                let client = RFBClient(inflater: StoredBlockInflater(), desEncryptor: des, password: "passwordignored", shared: false)
                let banner = Array("RFB 003.00\(version)\n".utf8)
                let selection: [UInt8] = version == 3 ? [0, 0, 0, 2] : [2, 1, 2]
                let challenge = Array(UInt8(0)...UInt8(15))
                let bytes = banner + selection + challenge + [0, 0, 0, 0] + RFBFixture.serverInit()
                let output = RFBFixture.feed(bytes, to: client, bytewise: bytewise)
                XCTAssertEqual(client.state, .connected)
                XCTAssertEqual(des.challenges, [Data(challenge)])
                XCTAssertEqual(des.keys, [Data([0x0e, 0x86, 0xce, 0xce, 0xee, 0xf6, 0x4e, 0x26])])
                let sent = RFBFixture.sent(output)
                XCTAssertEqual(sent[version == 3 ? 1 : 2], des.response)
                XCTAssertEqual(sent[version == 3 ? 2 : 3], Data([0]))
            }
        }
    }

    func testShortAndEmptyPasswordsAreZeroPadded() {
        for (password, key) in [("A", [UInt8(0x82)] + Array(repeating: 0, count: 7)), ("", Array(repeating: UInt8(0), count: 8))] {
            let des = RecordingDES()
            let client = RFBClient(inflater: StoredBlockInflater(), desEncryptor: des, password: password)
            _ = client.receive(Data(Array("RFB 003.008\n".utf8) + [1, 2] + Array(repeating: 0, count: 16)))
            XCTAssertEqual(des.keys, [Data(key)])
        }
    }

    func testSecurityFailureReasonsForAllVersions() {
        for version in [3, 7, 8] {
            let zero: [UInt8] = version == 3 ? [0, 0, 0, 0] : [0]
            let bytes = Array("RFB 003.00\(version)\n".utf8) + zero + [0, 0, 0, 6] + Array("Denied".utf8)
            for bytewise in [false, true] {
                let client = RFBClient(inflater: StoredBlockInflater())
                let output = RFBFixture.feed(bytes, to: client, bytewise: bytewise)
                XCTAssertEqual(RFBFixture.events(output), [.failed(.authenticationFailed("Denied"))])
                XCTAssertEqual(client.state, .failed)
                XCTAssertEqual(client.receive(Data([2])), [])
            }
        }
    }

    func testAuthenticationFailureWith38ReasonAndOlderStatus() {
        for version in [3, 7, 8] {
            let security: [UInt8] = version == 3 ? [0, 0, 0, 2] : [1, 2]
            let reason = version == 8 ? [0, 0, 0, 5] + Array("Wrong".utf8) : []
            let prefix = Array("RFB 003.00\(version)\n".utf8) + security + Array(repeating: UInt8(0), count: 16)
            for bytewise in [false, true] {
                let client = RFBClient(inflater: StoredBlockInflater(), desEncryptor: RecordingDES())
                let output = RFBFixture.feed(prefix + [0, 0, 0, 1] + reason, to: client, bytewise: bytewise)
                let message = version == 8 ? "Wrong" : "VNC authentication failed (1)"
                XCTAssertEqual(RFBFixture.events(output), [.failed(.authenticationFailed(message))])
            }
        }
    }

    func test38NoneWaitsForSecurityResultAndReportsFailure() {
        let client = RFBClient(inflater: StoredBlockInflater())
        let initial = client.receive(Data(Array("RFB 003.008\n".utf8) + [1, 1]))
        XCTAssertEqual(RFBFixture.sent(initial), [Data("RFB 003.008\n".utf8), Data([1])])
        XCTAssertEqual(client.state, .handshaking)
        let output = client.receive(Data([0, 0, 0, 1, 0, 0, 0, 0]))
        XCTAssertEqual(RFBFixture.events(output), [.failed(.authenticationFailed(""))])
    }

    func testUnsupportedSecurityAndMissingEncryptorFail() {
        let cases: [[UInt8]] = [[1, 19], [1, 2]]
        for offer in cases {
            let client = RFBClient(inflater: StoredBlockInflater())
            let output = client.receive(Data(Array("RFB 003.008\n".utf8) + offer))
            XCTAssertEqual(RFBFixture.events(output), [.failed(.unsupportedSecurity)])
        }
        let client = RFBClient(inflater: StoredBlockInflater())
        XCTAssertEqual(RFBFixture.events(client.receive(Data(Array("RFB 003.003\n".utf8) + [0, 0, 0, 2]))),
                       [.failed(.unsupportedSecurity)])
    }

    func testNoneCanBeSelectedWithoutAnEncryptor() {
        let client = RFBClient(inflater: StoredBlockInflater())
        let output = client.receive(Data(Array("RFB 003.008\n".utf8) + [2, 2, 1]))
        XCTAssertEqual(RFBFixture.sent(output).last, Data([1]))
        XCTAssertEqual(client.state, .handshaking)
    }

    func testDESFailureAndWrongResponseLengthAreTerminal() {
        for throwsError in [false, true] {
            let des = RecordingDES()
            des.shouldThrow = throwsError
            des.response = Data([0])
            let client = RFBClient(inflater: StoredBlockInflater(), desEncryptor: des)
            let input = Array("RFB 003.008\n".utf8) + [1, 2] + Array(repeating: UInt8(0), count: 16)
            XCTAssertEqual(RFBFixture.events(client.receive(Data(input))), [.failed(.encryptionFailed)])
        }
    }

    func testVersionNegotiationAndMalformedBanners() {
        for (banner, expected) in [("RFB 003.889\n", "RFB 003.008\n"), ("RFB 003.006\n", "RFB 003.003\n")] {
            let client = RFBClient(inflater: StoredBlockInflater())
            XCTAssertEqual(client.receive(Data(banner.utf8)), [.send(Data(expected.utf8))])
        }
        for banner in ["RFB 002.008\n", "RFB 003.002\n", "RFB 003.00x\n", "BAD 003.008\n", "RFB 003.008!"] {
            let client = RFBClient(inflater: StoredBlockInflater())
            XCTAssertEqual(client.receive(Data(banner.utf8)), [.event(.failed(.unsupportedVersion))])
        }
    }

    func testOversizedNameReasonAndFramebufferAreRejected() {
        let prefix = Array("RFB 003.008\n".utf8) + [1, 1, 0, 0, 0, 0]
        let initial = RFBFixture.u16(1) + RFBFixture.u16(1) + RFBFixture.format + [127, 255, 255, 255]
        let cases = [prefix + initial,
                     prefix + RFBFixture.serverInit(width: 65535, height: 65535),
                     prefix + RFBFixture.serverInit(width: 0),
                     Array("RFB 003.008\n".utf8) + [0, 127, 255, 255, 255]]
        for bytes in cases {
            let client = RFBClient(inflater: StoredBlockInflater())
            XCTAssertEqual(RFBFixture.events(client.receive(Data(bytes))), [.failed(.limitExceeded)])
        }
    }
}
